import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResendCodeDto {
  @ApiProperty({ description: 'attemptId devuelto por el login cuando el dispositivo no era de confianza.' })
  @IsString()
  @MinLength(1)
  attemptId!: string;
}
