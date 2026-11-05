import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de un solo uso recibido por correo en el enlace de recuperación.' })
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty({
    example: 'Contraseña-Segura123',
    description: 'Mínimo 10 caracteres, con al menos una mayúscula, una minúscula y un número.',
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}$/, {
    message: 'password debe tener mínimo 10 caracteres, con mayúscula, minúscula y número',
  })
  password!: string;
}
