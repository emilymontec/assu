/**
 * Error de VALIDACIÓN del archivo (mime/tamaño inválido). Es un rechazo
 * temprano y determinístico — no pasa por OCR ni por la máquina de
 * estados de PaymentSubmission, porque el submission ni siquiera debe
 * llegar a crearse con un archivo inválido.
 */
export class InvalidReceiptFileError extends Error {}

/**
 * Fallo TÉCNICO del proveedor de OCR (timeout, servicio caído, archivo
 * corrupto). Se distingue explícitamente de "OCR corrió pero con baja
 * confianza": esto último no es un error, es un resultado válido con
 * `OcrConfidence.LOW` que debe llevar a MANUAL_REVIEW, no a ERROR.
 */
export class OcrProviderError extends Error {}
