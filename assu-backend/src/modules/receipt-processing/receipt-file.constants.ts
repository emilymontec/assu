/**
 * Sección 8 del roadmap: nunca confiar en el archivo tal cual llega.
 * Límites conservadores; ajustables por config si hace falta.
 */
export const ALLOWED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

export const MAX_RECEIPT_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export type AllowedReceiptMimeType = (typeof ALLOWED_RECEIPT_MIME_TYPES)[number];
