import { ApiProperty } from '@nestjs/swagger';
import { Movement } from '../../../core/domain/movement/movement.entity';
import { MovementStatus } from '../../../core/domain/movement/movement-status.enum';
import { MovementType } from '../../../core/domain/movement/movement-type.enum';

/** `rawData` queda fuera a propósito en el listado normal — es voluminoso y es un detalle de debug, no de negocio. */
export class MovementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() accountId!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true }) sender!: string | null;
  @ApiProperty({ nullable: true }) receiver!: string | null;
  @ApiProperty({ enum: MovementType }) movementType!: MovementType;
  @ApiProperty() date!: Date;
  @ApiProperty({ enum: MovementStatus }) status!: MovementStatus;
  @ApiProperty() verified!: boolean;
  @ApiProperty() createdAt!: Date;

  static from(movement: Movement): MovementResponseDto {
    const dto = new MovementResponseDto();
    dto.id = movement.id;
    dto.accountId = movement.accountId;
    dto.reference = movement.reference;
    dto.amount = movement.amount;
    dto.currency = movement.currency;
    dto.sender = movement.sender;
    dto.receiver = movement.receiver;
    dto.movementType = movement.movementType;
    dto.date = movement.date;
    dto.status = movement.status;
    dto.verified = movement.verified;
    dto.createdAt = movement.createdAt;
    return dto;
  }
}
