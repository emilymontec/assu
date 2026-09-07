export const RECEIPT_STORAGE_PORT = Symbol('RECEIPT_STORAGE_PORT');

/**
 * Guarda el archivo crudo del comprobante y devuelve una referencia
 * OPACA (no una ruta de filesystem ni una URL firmada de larga
 * duración) para que nunca termine expuesta en logs o en la respuesta
 * de la API. Quien necesite el archivo real debe pedirlo explícitamente
 * con `getSignedUrl`/`read`, nunca reconstruir la ruta a mano.
 */
export interface ReceiptStoragePort {
  store(fileBuffer: Buffer, mimeType: string, submissionId: string): Promise<string>;
  read(storageRef: string): Promise<Buffer>;
}
