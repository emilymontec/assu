export const ENCRYPTION_PORT = Symbol('ENCRYPTION_PORT');

export interface EncryptionPort {
  encrypt(plainText: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}
