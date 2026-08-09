export const ENCRYPTION_PORT = Symbol('ENCRYPTION_PORT');

/**
 * Implementado por el módulo Credentials/Security (AES-256-GCM).
 * Es el ÚNICO puerto autorizado a mover credenciales en texto plano.
 */
export interface EncryptionPort {
  encrypt(plainText: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}
