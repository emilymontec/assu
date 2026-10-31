export const DOCUMENT_PHOTO_STORAGE_PORT = Symbol('DOCUMENT_PHOTO_STORAGE_PORT');

/**
 * Mismo contrato que ReceiptStoragePort (guarda y devuelve una
 * referencia OPACA, nunca una ruta/URL cruda), pero para la foto del
 * documento de identidad que sube un comercio al registrarse. A
 * diferencia de los recibos, el contenido viaja cifrado en disco (ver
 * LocalDocumentPhotoStorageAdapter) — es un documento de identidad, se
 * trata con el mismo cuidado que las credenciales bancarias.
 */
export interface DocumentPhotoStoragePort {
  store(fileBuffer: Buffer, mimeType: string, merchantId: string): Promise<string>;
  read(storageRef: string): Promise<Buffer>;
}
