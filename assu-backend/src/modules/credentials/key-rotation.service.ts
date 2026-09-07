import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface KeyEntry {
  fingerprint: string;
  key: Buffer;
}

/**
 * Cada clave se identifica por un fingerprint corto (hash de la propia
 * clave), NO por un número de versión que alguien deba llevar la cuenta
 * manualmente. Esto significa que el ciphertext siempre "sabe" con qué
 * clave fue cifrado, y rotar es tan simple como: mover el valor actual de
 * CREDENTIALS_ENCRYPTION_KEY a CREDENTIALS_ENCRYPTION_KEY_PREVIOUS, y
 * poner una clave nueva en CREDENTIALS_ENCRYPTION_KEY. Los datos viejos
 * se siguen pudiendo leer; los nuevos ya usan la clave nueva.
 */
@Injectable()
export class KeyRotationService implements OnModuleInit {
  private readonly logger = new Logger(KeyRotationService.name);
  private currentKey!: KeyEntry;
  private readonly keysByFingerprint = new Map<string, Buffer>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const currentHex = this.configService.get<string>('security.credentialsEncryptionKey');
    const previousHex = this.configService.get<string>('security.credentialsEncryptionKeyPrevious');

    if (!currentHex) {
      // env.validation.ts ya debería haber bloqueado el arranque antes de
      // llegar aquí; esto es una segunda barrera por si algo cambia esa validación.
      throw new Error('CREDENTIALS_ENCRYPTION_KEY no está configurada');
    }

    const currentKeyBuffer = Buffer.from(currentHex, 'hex');
    this.currentKey = { fingerprint: this.fingerprintOf(currentKeyBuffer), key: currentKeyBuffer };
    this.keysByFingerprint.set(this.currentKey.fingerprint, currentKeyBuffer);

    if (previousHex) {
      const previousKeyBuffer = Buffer.from(previousHex, 'hex');
      const previousFingerprint = this.fingerprintOf(previousKeyBuffer);
      this.keysByFingerprint.set(previousFingerprint, previousKeyBuffer);
      this.logger.warn(
        `Clave de cifrado anterior (fingerprint ${previousFingerprint}) sigue activa para descifrado — ` +
          'recuerda quitarla de las variables de entorno cuando termine la rotación.',
      );
    }
  }

  private fingerprintOf(key: Buffer): string {
    return createHash('sha256').update(key).digest('hex').slice(0, 8);
  }

  /** Usada siempre para CIFRAR datos nuevos. */
  getCurrentKey(): KeyEntry {
    return this.currentKey;
  }

  /** Usada para DESCIFRAR: busca la clave por el fingerprint embebido en el ciphertext. */
  getKeyByFingerprint(fingerprint: string): Buffer | undefined {
    return this.keysByFingerprint.get(fingerprint);
  }
}
