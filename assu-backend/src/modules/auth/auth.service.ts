import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { compare, hash } from 'bcryptjs';
import { MerchantService } from '../merchant/merchant.service';
import { MerchantStatus } from '../../core/domain/merchant/merchant-status.enum';
import { LoginChallengeType } from '../../core/domain/auth/login-challenge-type.enum';
import { LoginChallengeStatus } from '../../core/domain/auth/login-challenge-status.enum';
import { LoginChallengeRepository } from './repositories/login-challenge.repository';
import { TrustedDeviceRepository } from './repositories/trusted-device.repository';
import { MERCHANT_NOTIFIER_PORT, MerchantNotifierPort } from '../../core/ports/merchant-notifier.port';
import { NotificationType } from '../../core/domain/notification/notification-type.enum';
import { EMAIL_PORT, EmailPort } from '../../core/ports/email.port';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { LoginChallengeResponseDto } from './dto/login-challenge-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { MerchantResponseDto } from '../merchant/dto/merchant-response.dto';
import { AttemptStatus, AttemptStatusResponseDto } from './dto/attempt-status-response.dto';
import { PendingApprovalResponseDto } from './dto/pending-approval-response.dto';

export interface DeviceContext {
  fingerprint: string;
  label: string;
}

/** Deriva un fingerprint estable a partir de un id de dispositivo generado client-side + el User-Agent. */
export function computeDeviceFingerprint(deviceId: string, userAgent: string): string {
  return createHash('sha256').update(`${deviceId}|${userAgent}`).digest('hex');
}

function generateSixDigitCode(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

/**
 * Orquesta login + segundo factor del Portal de Comercios. Dos caminos
 * de segundo factor corren EN PARALELO para el mismo `attemptId`
 * (ninguno es "el principal"): el código de 6 dígitos por correo
 * (siempre disponible) y, si el comercio ya tiene al menos otro
 * dispositivo de confianza, una aprobación tipo "¿eres tú?" que ese otro
 * dispositivo puede conceder sin escribir nada (igual que el prompt de
 * Google). El primero que se complete gana: cierra el login.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginChallengeRepository: LoginChallengeRepository,
    private readonly trustedDeviceRepository: TrustedDeviceRepository,
    @Inject(MERCHANT_NOTIFIER_PORT) private readonly merchantNotifier: MerchantNotifierPort,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
  ) {}

  /**
   * Único punto de entrada del login. Si `device` ya es de confianza
   * para este comercio, entrega la sesión de una (sin segundo factor —
   * es exactamente "recordar este navegador"). Si no, crea el/los
   * challenge(s) de segundo factor y devuelve el `attemptId` para
   * completarlo por `verifyEmailCode()` o `completeByDeviceApproval()`.
   */
  async login(dto: LoginDto, device: DeviceContext): Promise<SessionResponseDto | LoginChallengeResponseDto> {
    const merchant = await this.merchantService.findByEmail(dto.email);

    // Mensaje genérico a propósito: no se revela si falló el correo o la
    // contraseña, para no ayudar a enumerar cuentas registradas.
    if (!merchant || !(await compare(dto.password, merchant.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (merchant.status === MerchantStatus.SUSPENDED) {
      throw new ForbiddenException('Esta cuenta está suspendida. Contacta a soporte.');
    }

    const existingTrustedDevice = await this.trustedDeviceRepository.findActive(merchant.id, device.fingerprint);
    if (existingTrustedDevice) {
      await this.trustedDeviceRepository.touchLastUsed(existingTrustedDevice.id);
      return this.issueSession(merchant.id);
    }

    const attemptId = randomUUID();
    const expiresAt = new Date(
      Date.now() + (this.configService.get<number>('auth.emailCodeExpiryMinutes') ?? 10) * 60_000,
    );

    const code = generateSixDigitCode();
    await this.loginChallengeRepository.create({
      attemptId,
      merchantId: merchant.id,
      type: LoginChallengeType.EMAIL_CODE,
      secretHash: await hash(code, 10),
      newDeviceFingerprint: device.fingerprint,
      newDeviceLabel: device.label,
      expiresAt,
    });

    await this.email.send({
      to: merchant.email,
      subject: 'Tu código de verificación de Assu',
      text: `Tu código de verificación es ${code}. Vence en ${this.configService.get('auth.emailCodeExpiryMinutes')} minutos. Si no fuiste tú, ignora este correo.`,
      html: `<p>Tu código de verificación es <strong>${code}</strong>.</p><p>Vence en ${this.configService.get('auth.emailCodeExpiryMinutes')} minutos. Si no fuiste tú, ignora este correo.</p>`,
    });

    const activeTrustedDevices = await this.trustedDeviceRepository.countActive(merchant.id);
    const canApproveFromTrustedDevice = activeTrustedDevices > 0;

    if (canApproveFromTrustedDevice) {
      const deviceApprovalExpiresAt = new Date(
        Date.now() + (this.configService.get<number>('auth.deviceApprovalExpiryMinutes') ?? 5) * 60_000,
      );
      await this.loginChallengeRepository.create({
        attemptId,
        merchantId: merchant.id,
        type: LoginChallengeType.DEVICE_APPROVAL,
        secretHash: null,
        newDeviceFingerprint: device.fingerprint,
        newDeviceLabel: device.label,
        expiresAt: deviceApprovalExpiresAt,
      });
    }

    const dto2 = new LoginChallengeResponseDto();
    dto2.attemptId = attemptId;
    dto2.canApproveFromTrustedDevice = canApproveFromTrustedDevice;
    dto2.emailMasked = maskEmail(merchant.email);
    return dto2;
  }

  async verifyEmailCode(dto: VerifyEmailCodeDto, device: DeviceContext): Promise<SessionResponseDto> {
    const challenge = await this.loginChallengeRepository.findPendingByAttemptIdAndType(
      dto.attemptId,
      LoginChallengeType.EMAIL_CODE,
    );

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('El código expiró o el intento de login ya no es válido. Inicia sesión de nuevo.');
    }

    if (!challenge.secretHash || !(await compare(dto.code, challenge.secretHash))) {
      throw new UnauthorizedException('Código incorrecto');
    }

    await this.loginChallengeRepository.updateStatus(challenge.id, LoginChallengeStatus.APPROVED);
    return this.completeTrustedLogin(challenge.merchantId, challenge.newDeviceFingerprint, challenge.newDeviceLabel);
  }

  async getAttemptStatus(attemptId: string): Promise<AttemptStatusResponseDto> {
    const challenges = await this.loginChallengeRepository.findByAttemptId(attemptId);
    if (challenges.length === 0) {
      throw new UnauthorizedException('Intento de login no encontrado');
    }

    const dto = new AttemptStatusResponseDto();
    dto.status = this.deriveAttemptStatus(challenges);
    return dto;
  }

  /** Lo llama el dispositivo ORIGINAL (el que inició sesión) mientras espera la aprobación del otro. */
  async completeByDeviceApproval(attemptId: string): Promise<SessionResponseDto> {
    const challenges = await this.loginChallengeRepository.findByAttemptId(attemptId);
    const deviceChallenge = challenges.find((c) => c.type === LoginChallengeType.DEVICE_APPROVAL);

    if (!deviceChallenge || deviceChallenge.status !== LoginChallengeStatus.APPROVED) {
      throw new UnauthorizedException('Este inicio de sesión todavía no ha sido aprobado desde otro dispositivo');
    }

    return this.completeTrustedLogin(
      deviceChallenge.merchantId,
      deviceChallenge.newDeviceFingerprint,
      deviceChallenge.newDeviceLabel,
    );
  }

  async listPendingApprovals(merchantId: string): Promise<PendingApprovalResponseDto[]> {
    const challenges = await this.loginChallengeRepository.findPendingDeviceApprovalsForMerchant(merchantId);
    return challenges
      .filter((c) => c.expiresAt >= new Date())
      .map((c) => {
        const dto = new PendingApprovalResponseDto();
        dto.id = c.id;
        dto.newDeviceLabel = c.newDeviceLabel;
        dto.createdAt = c.createdAt;
        dto.expiresAt = c.expiresAt;
        return dto;
      });
  }

  async approveDevice(challengeId: string, approverMerchantId: string): Promise<void> {
    const challenge = await this.getOwnedPendingChallenge(challengeId, approverMerchantId);
    await this.loginChallengeRepository.updateStatus(challenge.id, LoginChallengeStatus.APPROVED);
    // No se otorga sesión aquí: el dispositivo ORIGINAL la obtiene al
    // llamar completeByDeviceApproval() — este dispositivo (el que
    // aprueba) ya tiene la suya propia y no necesita una nueva.
  }

  async denyDevice(challengeId: string, approverMerchantId: string): Promise<void> {
    const challenge = await this.getOwnedPendingChallenge(challengeId, approverMerchantId);
    await this.loginChallengeRepository.updateStatus(challenge.id, LoginChallengeStatus.DENIED);
  }

  async me(merchantId: string): Promise<MerchantResponseDto> {
    const merchant = await this.merchantService.findById(merchantId);
    return MerchantResponseDto.fromDomain(merchant);
  }

  private async getOwnedPendingChallenge(challengeId: string, approverMerchantId: string) {
    const challenge = await this.loginChallengeRepository.findById(challengeId);
    if (!challenge || challenge.merchantId !== approverMerchantId) {
      throw new ForbiddenException('No puedes actuar sobre esta solicitud de aprobación');
    }
    if (challenge.status !== LoginChallengeStatus.PENDING || challenge.expiresAt < new Date()) {
      throw new BadRequestException('Esta solicitud de aprobación ya no está pendiente');
    }
    return challenge;
  }

  /**
   * Punto único al que llegan AMBOS caminos de segundo factor una vez
   * superados: marca el dispositivo como de confianza (idempotente —
   * si ya lo era, solo refresca `lastUsedAt`), activa el correo del
   * comercio si era su primera verificación, notifica el nuevo acceso
   * (correo + centro de notificaciones) y entrega la sesión.
   */
  private async completeTrustedLogin(merchantId: string, fingerprint: string, label: string): Promise<SessionResponseDto> {
    const wasAlreadyTrusted = Boolean(await this.trustedDeviceRepository.findActive(merchantId, fingerprint));
    await this.trustedDeviceRepository.upsertTrusted(merchantId, fingerprint, label);

    const merchant = await this.merchantService.findById(merchantId);
    if (merchant.status === MerchantStatus.PENDING_VERIFICATION) {
      await this.merchantService.markEmailVerified(merchantId);
    }

    // Solo se notifica "nuevo acceso" si el dispositivo era REALMENTE
    // nuevo — si ya era de confianza (ej. el código llegó tarde y el
    // comercio reintentó), no tiene sentido avisar dos veces del mismo acceso.
    if (!wasAlreadyTrusted) {
      await this.merchantNotifier.notify({
        merchantId,
        type: NotificationType.NEW_LOGIN,
        message: `Se inició sesión en tu cuenta desde un dispositivo nuevo: ${label}. Si no fuiste tú, cambia tu contraseña de inmediato.`,
        metadata: { deviceLabel: label },
      });
    }

    return this.issueSession(merchantId);
  }

  private async issueSession(merchantId: string): Promise<SessionResponseDto> {
    const merchant = await this.merchantService.findById(merchantId);
    const accessToken = await this.jwtService.signAsync({ sub: merchant.id, email: merchant.email });

    const dto = new SessionResponseDto();
    dto.accessToken = accessToken;
    dto.merchant = MerchantResponseDto.fromDomain(merchant);
    return dto;
  }

  private deriveAttemptStatus(challenges: { status: LoginChallengeStatus; expiresAt: Date }[]): AttemptStatus {
    if (challenges.some((c) => c.status === LoginChallengeStatus.APPROVED)) return 'APPROVED';
    if (challenges.some((c) => c.status === LoginChallengeStatus.DENIED)) return 'DENIED';
    if (challenges.every((c) => c.status === LoginChallengeStatus.EXPIRED || c.expiresAt < new Date())) {
      return 'EXPIRED';
    }
    return 'PENDING';
  }
}
