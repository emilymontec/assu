import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EncryptionPort } from '../../core/ports/encryption.port';
import { KeyRotationService } from './key-rotation.service';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // recomendado por NIST para GCM
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * Formato del ciphertext almacenado: `<fingerprint>:<base64(iv|authTag|datos)>`
 *
 * - `fingerprint`: identifica CON QUÉ CLAVE se cifró (ver KeyRotationService),
 *   así el descifrado siempre usa la clave correcta aunque haya rotado.
 * - GCM incluye un authTag: si alguien modifica el ciphertext (aunque sea
 *   un bit), `decrypt()` lanza un error en vez de devolver basura
 *   silenciosamente — es cifrado autenticado, no solo confidencial.
 *
 * Este es el ÚNICO servicio del sistema autorizado a mover credenciales
 * bancarias en texto plano, y solo transitoriamente en memoria durante
 * la llamada a encrypt()/decrypt().
 */
@Injectable()
export class EncryptionService implements EncryptionPort {
  constructor(private readonly keyRotation: KeyRotationService) {}

  async encrypt(plainText: string): Promise<string> {
    const { fingerprint, key } = this.keyRotation.getCurrentKey();
    const iv = randomBytes(IV_LENGTH_BYTES);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const payload = Buffer.concat([iv, authTag, encrypted]);
    return `${fingerprint}:${payload.toString('base64')}`;
  }

  async decrypt(cipherText: string): Promise<string> {
    const separatorIndex = cipherText.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error('Formato de ciphertext inválido: falta el fingerprint de la clave');
    }

    const fingerprint = cipherText.slice(0, separatorIndex);
    const payloadBase64 = cipherText.slice(separatorIndex + 1);
    const key = this.keyRotation.getKeyByFingerprint(fingerprint);

    if (!key) {
      throw new Error(
        `No se encontró la clave de cifrado con fingerprint "${fingerprint}". ` +
          'Si esto ocurre tras una rotación, verifica que CREDENTIALS_ENCRYPTION_KEY_PREVIOUS ' +
          'todavía tenga configurada la clave anterior.',
      );
    }

    const payload = Buffer.from(payloadBase64, 'base64');
    const iv = payload.subarray(0, IV_LENGTH_BYTES);
    const authTag = payload.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const encrypted = payload.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Si el ciphertext fue alterado, esta línea lanza un error (GCM detecta la manipulación).
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
