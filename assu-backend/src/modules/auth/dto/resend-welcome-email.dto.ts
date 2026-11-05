import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendWelcomeEmailDto {
  @ApiProperty({ example: 'maria@mitienda.co' })
  @IsEmail()
  email!: string;
}
