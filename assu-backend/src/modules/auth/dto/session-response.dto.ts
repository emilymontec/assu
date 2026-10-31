import { ApiProperty } from '@nestjs/swagger';
import { MerchantResponseDto } from '../../merchant/dto/merchant-response.dto';

export class SessionResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: MerchantResponseDto }) merchant!: MerchantResponseDto;
}
