import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { PaymentVerificationService } from './payment-verification.service';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';
import { ManualReviewDto } from './dto/manual-review.dto';

/**
 * Expone el estado de los comprobantes al resto de la plataforma /
 * panel de operaciones (secciones 19 y 23 del roadmap: "Admin /
 * Operations" — ver movimientos, revisar errores, ejecutar revisión
 * manual). Deliberadamente NO expone un endpoint para subir el
 * comprobante en sí: eso es responsabilidad de cada adapter de canal
 * (ver `receipt-ingestion`), porque cada canal tiene su propio formato
 * de payload de entrada.
 */
@ApiTags('payment-verification')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('payment-verifications')
export class PaymentVerificationController {
  constructor(private readonly service: PaymentVerificationService) {}

  @Get()
  @ApiOperation({ summary: 'Lista comprobantes con filtros (estado, cuenta, rango de fechas)' })
  async findAll(@Query() query: ListSubmissionsQueryDto): Promise<PaymentSubmissionResponseDto[]> {
    const submissions = await this.service.findMany({
      status: query.status,
      bankAccountId: query.bankAccountId,
      dateFrom: query.from,
      dateTo: query.to,
    });
    return submissions.map(PaymentSubmissionResponseDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un comprobante' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentSubmissionResponseDto> {
    const submission = await this.service.findById(id);
    return PaymentSubmissionResponseDto.from(submission);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Audit trail de transiciones de estado del comprobante' })
  async findEvents(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listEvents(id);
  }

  @Post(':id/manual-review')
  @ApiOperation({
    summary:
      'Aplica una decisión humana explícita (ej. AMBIGUOUS/MANUAL_REVIEW → VERIFIED o REJECTED). Queda auditada con el actor y el motivo.',
  })
  async manualReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualReviewDto,
  ): Promise<PaymentSubmissionResponseDto> {
    // El prefijo "USER:" es intencional: garantiza que este actor nunca
    // pueda confundirse con "SYSTEM" en el audit trail, sin importar lo
    // que envíe el llamador.
    const submission = await this.service.manualReview(id, dto.toStatus, dto.reason, `USER:${dto.actor}`);
    return PaymentSubmissionResponseDto.from(submission);
  }
}
