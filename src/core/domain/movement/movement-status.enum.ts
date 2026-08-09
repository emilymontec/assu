export enum MovementStatus {
  RECEIVED = 'RECEIVED', // recién parseado, aún no validado
  VALID = 'VALID', // pasó Movement Validator
  INVALID = 'INVALID', // falló validación, no se publica evento
  DUPLICATE = 'DUPLICATE', // detectado como duplicado, no se persiste como nuevo
}
