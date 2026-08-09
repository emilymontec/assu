export enum MovementType {
  DEPOSIT = 'DEPOSIT',
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
  REVERSAL = 'REVERSAL',
  PAYMENT = 'PAYMENT',
  UNKNOWN = 'UNKNOWN', // el parser no pudo clasificarlo con certeza
}
