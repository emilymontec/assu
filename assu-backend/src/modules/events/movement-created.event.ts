/**
 * Contrato versionado del evento principal del sistema. Cualquier cambio
 * incompatible debe ir en un nuevo `MovementCreatedPayloadV2` + version
 * "v2" en el evento — nunca modificando este tipo en el lugar (eso
 * rompería a los consumidores existentes sin avisar).
 */
export interface MovementCreatedPayload {
  movementId: string;
  accountId: string;
  bank: string;
  amount: number;
  currency: string;
  reference: string;
  date: string; // ISO 8601
}

export const MOVEMENT_CREATED_EVENT = 'movement.created';
export const MOVEMENT_CREATED_EVENT_VERSION = 'v1';
