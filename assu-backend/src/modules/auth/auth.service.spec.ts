/**
 * `AuthService` importa `MerchantService`/`LoginChallengeRepository`/
 * `TrustedDeviceRepository` solo como TIPOS (parámetros del
 * constructor), pero NestJS necesita esa metadata en runtime, así que
 * TypeScript no puede elidir esos imports. Sin estos mocks, Jest
 * arrastraría la cadena real hasta `@prisma/client` (vía PrismaService) y
 * fallaría por el límite de red del sandbox (no hay engine binario de
 * Prisma aquí) — mismo problema documentado para BankAccountService.
 * Los enums (`LoginChallengeType`/`LoginChallengeStatus`) SÍ se importan
 * de `core/domain/auth/*`, no del archivo del repositorio, precisamente
 * para que usarlos en los tests no obligue a cargar Prisma.
 */
jest.mock('../merchant/merchant.service', () => ({ MerchantService: class {} }));
jest.mock('./repositories/login-challenge.repository', () => ({ LoginChallengeRepository: class {} }));
jest.mock('./repositories/trusted-device.repository', () => ({ TrustedDeviceRepository: class {} }));
jest.mock('./repositories/password-reset.repository', () => ({ PasswordResetRepository: class {} }));

// eslint-disable-next-line import/first
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
// eslint-disable-next-line import/first
import { hashSync } from 'bcryptjs';
// eslint-disable-next-line import/first
import { AuthService, computeDeviceFingerprint } from './auth.service';
// eslint-disable-next-line import/first
import { LoginChallengeType } from '../../core/domain/auth/login-challenge-type.enum';
// eslint-disable-next-line import/first
import { LoginChallengeStatus } from '../../core/domain/auth/login-challenge-status.enum';
// eslint-disable-next-line import/first
import { MerchantStatus } from '../../core/domain/merchant/merchant-status.enum';
// eslint-disable-next-line import/first
import { DocumentType } from '../../core/domain/merchant/document-type.enum';
// eslint-disable-next-line import/first
import { Merchant } from '../../core/domain/merchant/merchant.entity';

const PLAIN_PASSWORD = 'Contraseña-Segura123';
const PASSWORD_HASH = hashSync(PLAIN_PASSWORD, 4); // 4 rounds: suficiente para el test, rápido

function makeMerchant(overrides: Partial<{ status: MerchantStatus }> = {}): Merchant {
  return new Merchant(
    'merchant-1',
    DocumentType.CC,
    '1098765432',
    'María Pérez',
    'maria@mitienda.co',
    '3001234567',
    PASSWORD_HASH,
    'local:merchant-1.jpg.enc',
    overrides.status ?? MerchantStatus.ACTIVE,
    new Date(),
    new Date(),
    new Date(),
  );
}

describe('AuthService', () => {
  const merchantService = { findByEmail: jest.fn(), findById: jest.fn(), markEmailVerified: jest.fn() };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
  const configService = {
    get: jest.fn(
      (key: string) =>
        ({
          'auth.emailCodeExpiryMinutes': 10,
          'auth.deviceApprovalExpiryMinutes': 5,
          'auth.passwordResetExpiryMinutes': 30,
          'portal.appUrl': 'http://localhost:3300',
        })[key],
    ),
  };
  const loginChallengeRepository = {
    create: jest.fn(),
    findByAttemptId: jest.fn(),
    findPendingByAttemptIdAndType: jest.fn(),
    findPendingDeviceApprovalsForMerchant: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    updateSecret: jest.fn(),
  };
  const trustedDeviceRepository = {
    findActive: jest.fn(),
    countActive: jest.fn(),
    upsertTrusted: jest.fn(),
    touchLastUsed: jest.fn(),
  };
  const passwordResetRepository = {
    create: jest.fn(),
    findActiveBySecretHash: jest.fn(),
    markUsed: jest.fn(),
    invalidateAllForMerchant: jest.fn(),
  };
  const merchantNotifier = { notify: jest.fn() };
  const emailPort = { send: jest.fn() };

  function buildService() {
    return new AuthService(
      merchantService as any,
      jwtService as any,
      configService as any,
      loginChallengeRepository as any,
      trustedDeviceRepository as any,
      passwordResetRepository as any,
      merchantNotifier as any,
      emailPort as any,
    );
  }

  const device = { fingerprint: computeDeviceFingerprint('device-abc', 'Mozilla/5.0 Chrome'), label: 'Chrome en Windows' };
  const loginDto = { email: 'maria@mitienda.co', password: PLAIN_PASSWORD };

  beforeEach(() => jest.clearAllMocks());

  it('rechaza con mensaje genérico si el correo no existe', async () => {
    merchantService.findByEmail.mockResolvedValue(null);
    const service = buildService();

    await expect(service.login(loginDto, device)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con el MISMO mensaje genérico si la contraseña es incorrecta (no revela cuál falló)', async () => {
    merchantService.findByEmail.mockResolvedValue(makeMerchant());
    const service = buildService();

    await expect(service.login({ ...loginDto, password: 'incorrecta' }, device)).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
  });

  it('rechaza el login de una cuenta suspendida', async () => {
    merchantService.findByEmail.mockResolvedValue(makeMerchant({ status: MerchantStatus.SUSPENDED }));
    const service = buildService();

    await expect(service.login(loginDto, device)).rejects.toThrow(ForbiddenException);
  });

  it('si el dispositivo ya es de confianza, entrega la sesión directamente sin pedir segundo factor', async () => {
    merchantService.findByEmail.mockResolvedValue(makeMerchant());
    merchantService.findById.mockResolvedValue(makeMerchant());
    trustedDeviceRepository.findActive.mockResolvedValue({ id: 'td-1' });
    const service = buildService();

    const result = await service.login(loginDto, device);

    expect(result).toHaveProperty('accessToken', 'signed.jwt.token');
    expect(trustedDeviceRepository.touchLastUsed).toHaveBeenCalledWith('td-1');
    expect(loginChallengeRepository.create).not.toHaveBeenCalled();
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it('dispositivo nuevo sin otros dispositivos de confianza: solo crea el challenge de código por correo', async () => {
    merchantService.findByEmail.mockResolvedValue(makeMerchant());
    trustedDeviceRepository.findActive.mockResolvedValue(null);
    trustedDeviceRepository.countActive.mockResolvedValue(0);
    const service = buildService();

    const result: any = await service.login(loginDto, device);

    expect(result.canApproveFromTrustedDevice).toBe(false);
    expect(result.attemptId).toBeDefined();
    expect(loginChallengeRepository.create).toHaveBeenCalledTimes(1);
    expect(loginChallengeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: LoginChallengeType.EMAIL_CODE }),
    );
    expect(emailPort.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'maria@mitienda.co' }));
  });

  it('dispositivo nuevo CON otro dispositivo de confianza: crea ambos challenges en paralelo', async () => {
    merchantService.findByEmail.mockResolvedValue(makeMerchant());
    trustedDeviceRepository.findActive.mockResolvedValue(null);
    trustedDeviceRepository.countActive.mockResolvedValue(1);
    const service = buildService();

    const result: any = await service.login(loginDto, device);

    expect(result.canApproveFromTrustedDevice).toBe(true);
    expect(loginChallengeRepository.create).toHaveBeenCalledTimes(2);
    expect(loginChallengeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: LoginChallengeType.DEVICE_APPROVAL, secretHash: null }),
    );
  });

  it('nunca expone el código real: el que viaja al repositorio es un hash bcrypt, no el texto plano', async () => {
    merchantService.findByEmail.mockResolvedValue(makeMerchant());
    trustedDeviceRepository.findActive.mockResolvedValue(null);
    trustedDeviceRepository.countActive.mockResolvedValue(0);
    const service = buildService();

    await service.login(loginDto, device);

    const createdChallenge = loginChallengeRepository.create.mock.calls[0][0];
    expect(createdChallenge.secretHash).toMatch(/^\$2[aby]\$/);
    const sentEmail = emailPort.send.mock.calls[0][0];
    expect(createdChallenge.secretHash).not.toBe(sentEmail.text);
  });

  it('verifyEmailCode con código incorrecto es rechazado', async () => {
    loginChallengeRepository.findPendingByAttemptIdAndType.mockResolvedValue({
      id: 'ch-1',
      merchantId: 'merchant-1',
      secretHash: hashSync('123456', 4),
      expiresAt: new Date(Date.now() + 60_000),
      newDeviceFingerprint: device.fingerprint,
      newDeviceLabel: device.label,
    });
    const service = buildService();

    await expect(service.verifyEmailCode({ attemptId: 'a1', code: '000000' }, device)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(trustedDeviceRepository.upsertTrusted).not.toHaveBeenCalled();
  });

  it('verifyEmailCode expirado es rechazado aunque el código sea correcto', async () => {
    loginChallengeRepository.findPendingByAttemptIdAndType.mockResolvedValue({
      id: 'ch-1',
      merchantId: 'merchant-1',
      secretHash: hashSync('123456', 4),
      expiresAt: new Date(Date.now() - 1000),
      newDeviceFingerprint: device.fingerprint,
      newDeviceLabel: device.label,
    });
    const service = buildService();

    await expect(service.verifyEmailCode({ attemptId: 'a1', code: '123456' }, device)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('verifyEmailCode correcto: marca el dispositivo de confianza, notifica el nuevo acceso y entrega sesión', async () => {
    loginChallengeRepository.findPendingByAttemptIdAndType.mockResolvedValue({
      id: 'ch-1',
      merchantId: 'merchant-1',
      secretHash: hashSync('123456', 4),
      expiresAt: new Date(Date.now() + 60_000),
      newDeviceFingerprint: device.fingerprint,
      newDeviceLabel: device.label,
    });
    trustedDeviceRepository.findActive.mockResolvedValue(null); // era un dispositivo nuevo
    merchantService.findById.mockResolvedValue(makeMerchant());
    const service = buildService();

    const result = await service.verifyEmailCode({ attemptId: 'a1', code: '123456' }, device);

    expect(trustedDeviceRepository.upsertTrusted).toHaveBeenCalledWith('merchant-1', device.fingerprint, device.label);
    expect(merchantNotifier.notify).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'merchant-1', type: 'NEW_LOGIN' }),
    );
    expect(result.accessToken).toBe('signed.jwt.token');
  });

  it('no reenvía la notificación de "nuevo acceso" si el dispositivo ya era de confianza', async () => {
    loginChallengeRepository.findPendingByAttemptIdAndType.mockResolvedValue({
      id: 'ch-1',
      merchantId: 'merchant-1',
      secretHash: hashSync('123456', 4),
      expiresAt: new Date(Date.now() + 60_000),
      newDeviceFingerprint: device.fingerprint,
      newDeviceLabel: device.label,
    });
    trustedDeviceRepository.findActive.mockResolvedValue({ id: 'td-1' }); // ya era de confianza
    merchantService.findById.mockResolvedValue(makeMerchant());
    const service = buildService();

    await service.verifyEmailCode({ attemptId: 'a1', code: '123456' }, device);

    expect(merchantNotifier.notify).not.toHaveBeenCalled();
  });

  it('activa la cuenta (PENDING_VERIFICATION → ACTIVE) en la primera verificación exitosa', async () => {
    loginChallengeRepository.findPendingByAttemptIdAndType.mockResolvedValue({
      id: 'ch-1',
      merchantId: 'merchant-1',
      secretHash: hashSync('123456', 4),
      expiresAt: new Date(Date.now() + 60_000),
      newDeviceFingerprint: device.fingerprint,
      newDeviceLabel: device.label,
    });
    trustedDeviceRepository.findActive.mockResolvedValue(null);
    merchantService.findById.mockResolvedValue(makeMerchant({ status: MerchantStatus.PENDING_VERIFICATION }));
    const service = buildService();

    await service.verifyEmailCode({ attemptId: 'a1', code: '123456' }, device);

    expect(merchantService.markEmailVerified).toHaveBeenCalledWith('merchant-1');
  });

  it('completeByDeviceApproval rechaza si el challenge de dispositivo no está aprobado todavía', async () => {
    loginChallengeRepository.findByAttemptId.mockResolvedValue([
      { type: LoginChallengeType.DEVICE_APPROVAL, status: LoginChallengeStatus.PENDING },
    ]);
    const service = buildService();

    await expect(service.completeByDeviceApproval('a1')).rejects.toThrow(UnauthorizedException);
  });

  it('completeByDeviceApproval entrega sesión una vez que el otro dispositivo aprobó', async () => {
    loginChallengeRepository.findByAttemptId.mockResolvedValue([
      {
        type: LoginChallengeType.DEVICE_APPROVAL,
        status: LoginChallengeStatus.APPROVED,
        merchantId: 'merchant-1',
        newDeviceFingerprint: device.fingerprint,
        newDeviceLabel: device.label,
      },
    ]);
    trustedDeviceRepository.findActive.mockResolvedValue(null);
    merchantService.findById.mockResolvedValue(makeMerchant());
    const service = buildService();

    const result = await service.completeByDeviceApproval('a1');

    expect(result.accessToken).toBe('signed.jwt.token');
  });

  it('approveDevice rechaza si el challenge pertenece a otro comercio', async () => {
    loginChallengeRepository.findById.mockResolvedValue({
      id: 'ch-1',
      merchantId: 'merchant-OTRO',
      status: LoginChallengeStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const service = buildService();

    await expect(service.approveDevice('ch-1', 'merchant-1')).rejects.toThrow(ForbiddenException);
    expect(loginChallengeRepository.updateStatus).not.toHaveBeenCalled();
  });
});
