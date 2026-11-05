import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, MerchantJwtPayload } from '../auth/jwt-auth.guard';
import { CurrentMerchant } from '../auth/current-merchant.decorator';
import { PaymentVerificationService } from './payment-verification.service';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';

/**
 * Cara PÚBLICA (para el comercio) de la verificación de comprobantes.
 *
 * Contrasta con `PaymentVerificationController`, que es la vista interna
 * del panel de operaciones (API key compartida, ve TODO). Este controlador
 * está protegido con `JwtAuthGuard` y acota SIEMPRE por `merchantId`: un
 * comercio solo puede ver los comprobantes de sus propias cuentas. Es la
 * pantalla que le faltaba al Portal ("¿se verificó el pago de mi cliente?").
 */
@ApiTags('portal-verifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal/verifications')
export class PortalPaymentVerificationController {
  constructor(private readonly service: PaymentVerificationService) {}

  @Get()
  @ApiOperation({ summary: 'Comprobantes de las cuentas del comercio autenticado, con filtros opcionales' })
  async findAll(
    @CurrentMerchant() merchant: MerchantJwtPayload,
    @Query() query: ListSubmissionsQueryDto,
  ): Promise<PaymentSubmissionResponseDto[]> {
    const submissions = await this.service.findMany({
      merchantId: merchant.sub,
      status: query.status,
      bankAccountId: query.bankAccountId,
      dateFrom: query.from,
      dateTo: query.to,
    });
    return submissions.map(PaymentSubmissionResponseDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un comprobante del comercio autenticado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentMerchant() merchant: MerchantJwtPayload,
  ): Promise<PaymentSubmissionResponseDto> {
    const submission = await this.service.findByIdForMerchant(id, merchant.sub);
    return PaymentSubmissionResponseDto.from(submission);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Historial de estados de un comprobante del comercio autenticado' })
  async findEvents(@Param('id', ParseUUIDPipe) id: string, @CurrentMerchant() merchant: MerchantJwtPayload) {
    return this.service.listEventsForMerchant(id, merchant.sub);
  }
}
