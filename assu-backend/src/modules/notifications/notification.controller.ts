import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, MerchantJwtPayload } from '../auth/jwt-auth.guard';
import { CurrentMerchant } from '../auth/current-merchant.decorator';
import { NotificationService } from './notification.service';
import { NotificationResponseDto } from './dto/notification-response.dto';

/** Centro de notificaciones del Portal de Comercios — cada comercio ve solo las suyas. */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Últimas notificaciones del comercio autenticado (accesos y cambios en sus cuentas)' })
  async findAll(@CurrentMerchant() merchant: MerchantJwtPayload): Promise<NotificationResponseDto[]> {
    const records = await this.notificationService.listForMerchant(merchant.sub);
    return records.map(NotificationResponseDto.from);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  async markRead(
    @Param('id') id: string,
    @CurrentMerchant() merchant: MerchantJwtPayload,
  ): Promise<NotificationResponseDto> {
    const record = await this.notificationService.markRead(id, merchant.sub);
    return NotificationResponseDto.from(record);
  }
}
