import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, computeDeviceFingerprint } from './auth.service';
import { MerchantService } from '../merchant/merchant.service';
import { JwtAuthGuard, MerchantJwtPayload } from './jwt-auth.guard';
import { CurrentMerchant } from './current-merchant.decorator';
import { RegisterMerchantDto } from './dto/register-merchant.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ResendWelcomeEmailDto } from './dto/resend-welcome-email.dto';
import { MerchantResponseDto } from '../merchant/dto/merchant-response.dto';
import { AttemptStatusResponseDto } from './dto/attempt-status-response.dto';
import { TrustedDeviceResponseDto } from './dto/trusted-device-response.dto';

const MAX_DOCUMENT_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_DOCUMENT_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'];

/**
 * Portal de Comercios: registro con documento de identidad + foto de
 * cédula, login con segundo factor (código por correo y/o aprobación
 * desde un dispositivo de confianza) y sesión. Sin `x-api-key` —
 * protegido por JWT por comercio (ver JwtAuthGuard), no por la API key
 * interna de servicio-a-servicio.
 */
@ApiTags('portal-auth')
@Controller('portal/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly merchantService: MerchantService,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('documentPhoto'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Datos personales + documento de identidad, junto con el archivo `documentPhoto` (foto de la cédula, jpg/png, máx 8MB)',
  })
  @ApiOperation({ summary: 'Registrar un comercio nuevo en el Portal' })
  async register(
    @Body() dto: RegisterMerchantDto,
    @UploadedFile() documentPhoto?: Express.Multer.File,
  ): Promise<MerchantResponseDto> {
    if (!documentPhoto) {
      throw new BadRequestException('Falta la foto del documento de identidad (campo "documentPhoto")');
    }
    if (!ALLOWED_DOCUMENT_PHOTO_MIME_TYPES.includes(documentPhoto.mimetype)) {
      throw new BadRequestException('La foto del documento debe ser JPG o PNG');
    }
    if (documentPhoto.size > MAX_DOCUMENT_PHOTO_BYTES) {
      throw new BadRequestException('La foto del documento no puede pesar más de 8MB');
    }

    const merchant = await this.merchantService.register({
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      documentPhoto: { buffer: documentPhoto.buffer, mimeType: documentPhoto.mimetype },
    });

    // El correo de bienvenida es best-effort (ver AuthService.sendWelcomeEmail):
    // no debe tumbar un registro que ya quedó persistido.
    await this.authService.sendWelcomeEmail(merchant.id);

    return MerchantResponseDto.fromDomain(merchant);
  }

  @Post('login')
  @ApiOperation({
    summary:
      'Inicia sesión. Si el dispositivo ya es de confianza, devuelve la sesión directamente; si no, devuelve un ' +
      'attemptId para completar el segundo factor (código por correo o aprobación desde otro dispositivo).',
  })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.deviceContext(req));
  }

  @Post('login/verify-code')
  @ApiOperation({ summary: 'Completa el login con el código de 6 dígitos enviado por correo' })
  async verifyCode(@Body() dto: VerifyEmailCodeDto, @Req() req: Request) {
    return this.authService.verifyEmailCode(dto, this.deviceContext(req));
  }

  @Get('login/attempts/:attemptId/status')
  @ApiOperation({ summary: 'Consulta el estado del segundo factor (para que el dispositivo que inició sesión haga polling)' })
  async attemptStatus(@Param('attemptId') attemptId: string): Promise<AttemptStatusResponseDto> {
    return this.authService.getAttemptStatus(attemptId);
  }

  @Post('login/attempts/:attemptId/complete')
  @ApiOperation({ summary: 'Entrega la sesión una vez que otro dispositivo de confianza aprobó este login' })
  async completeAttempt(@Param('attemptId') attemptId: string) {
    return this.authService.completeByDeviceApproval(attemptId);
  }

  @Post('login/resend-code')
  @ApiOperation({ summary: 'Reenvía el código de 6 dígitos de un intento de login pendiente (mismo attemptId)' })
  async resendCode(@Body() dto: ResendCodeDto): Promise<{ ok: true }> {
    await this.authService.resendEmailCode(dto.attemptId);
    return { ok: true };
  }

  @Post('forgot-password')
  @ApiOperation({
    summary:
      'Solicita un enlace de recuperación de contraseña. Responde OK exista o no la cuenta, para no permitir enumerar comercios.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.authService.requestPasswordReset(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Cambia la contraseña usando el token recibido por correo (de un solo uso)' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.authService.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Post('resend-welcome')
  @ApiOperation({ summary: 'Reenvía el correo de bienvenida (por si el comercio no lo recibió al registrarse)' })
  async resendWelcome(@Body() dto: ResendWelcomeEmailDto): Promise<{ ok: true }> {
    await this.authService.resendWelcomeEmail(dto.email);
    return { ok: true };
  }

  @Get('pending-approvals')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Solicitudes de "¿eres tú?" pendientes que este dispositivo (ya de confianza) puede aprobar' })
  async pendingApprovals(@CurrentMerchant() merchant: MerchantJwtPayload) {
    return this.authService.listPendingApprovals(merchant.sub);
  }

  @Patch('pending-approvals/:id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aprobar un inicio de sesión nuevo ("sí, soy yo")' })
  async approve(@Param('id') id: string, @CurrentMerchant() merchant: MerchantJwtPayload): Promise<{ ok: true }> {
    await this.authService.approveDevice(id, merchant.sub);
    return { ok: true };
  }

  @Patch('pending-approvals/:id/deny')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rechazar un inicio de sesión nuevo ("no fui yo")' })
  async deny(@Param('id') id: string, @CurrentMerchant() merchant: MerchantJwtPayload): Promise<{ ok: true }> {
    await this.authService.denyDevice(id, merchant.sub);
    return { ok: true };
  }

  @Get('devices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Dispositivos de confianza del comercio autenticado' })
  async listDevices(@CurrentMerchant() merchant: MerchantJwtPayload): Promise<TrustedDeviceResponseDto[]> {
    return this.authService.listTrustedDevices(merchant.sub);
  }

  @Delete('devices/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revocar la confianza de un dispositivo (volverá a pedir segundo factor al entrar)' })
  async revokeDevice(
    @Param('id') id: string,
    @CurrentMerchant() merchant: MerchantJwtPayload,
  ): Promise<{ ok: true }> {
    await this.authService.revokeTrustedDevice(merchant.sub, id);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Datos del comercio autenticado' })
  async me(@CurrentMerchant() merchant: MerchantJwtPayload): Promise<MerchantResponseDto> {
    return this.authService.me(merchant.sub);
  }

  /**
   * `x-device-id` lo genera y persiste el frontend (localStorage) la
   * primera vez que se usa el Portal en ese navegador — es lo único que
   * distingue "mismo dispositivo" de "dispositivo nuevo" entre logins.
   * Sin él no hay manera honesta de ofrecer "recordar este dispositivo",
   * así que se exige explícitamente en vez de inventar un fallback que
   * terminaría tratando cada login como un dispositivo distinto.
   */
  private deviceContext(req: Request): { fingerprint: string; label: string } {
    const deviceId = req.header('x-device-id');
    if (!deviceId) {
      throw new BadRequestException('Falta la cabecera x-device-id');
    }
    const userAgent = req.header('user-agent') ?? 'desconocido';
    const label = req.header('x-device-label') || this.guessLabel(userAgent);
    return { fingerprint: computeDeviceFingerprint(deviceId, userAgent), label };
  }

  private guessLabel(userAgent: string): string {
    const browser = /edg\//i.test(userAgent)
      ? 'Edge'
      : /chrome\//i.test(userAgent)
        ? 'Chrome'
        : /firefox\//i.test(userAgent)
          ? 'Firefox'
          : /safari\//i.test(userAgent)
            ? 'Safari'
            : 'Navegador';
    const os = /windows/i.test(userAgent)
      ? 'Windows'
      : /mac os/i.test(userAgent)
        ? 'macOS'
        : /android/i.test(userAgent)
          ? 'Android'
          : /iphone|ipad/i.test(userAgent)
            ? 'iOS'
            : /linux/i.test(userAgent)
              ? 'Linux'
              : 'dispositivo desconocido';
    return `${browser} en ${os}`;
  }
}
