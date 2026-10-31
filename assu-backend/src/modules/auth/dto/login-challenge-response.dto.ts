import { ApiProperty } from '@nestjs/swagger';

export class LoginChallengeResponseDto {
  @ApiProperty({ description: 'Id de este intento de login — se usa en los pasos siguientes del segundo factor' })
  attemptId!: string;

  @ApiProperty({ description: 'true si, además del código por correo, otro dispositivo de confianza puede aprobar este login' })
  canApproveFromTrustedDevice!: boolean;

  @ApiProperty({ example: 'ma***@mitienda.co' })
  emailMasked!: string;
}
