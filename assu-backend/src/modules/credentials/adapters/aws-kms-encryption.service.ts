import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { EncryptionPort } from '../../../core/ports/encryption.port';

/**
 * Implementación de `EncryptionPort` sobre AWS KMS.
 *
 * Diferencia clave frente a `EncryptionService` (AES-256-GCM local): acá
 * la clave criptográfica NUNCA sale de AWS KMS ni pasa por la memoria de
 * este proceso. Assu solo envía el texto plano (para cifrar) o el
 * ciphertext (para descifrar) por la API de KMS; AWS hace la operación
 * y devuelve el resultado. Si este servidor se ve comprometido, quien
 * lo comprometa no obtiene la clave — solo puede seguir pidiéndole a
 * KMS que cifre/descifre, y eso se puede cortar revocando el permiso de
 * IAM sin tocar ni un dato ya guardado.
 *
 * Usa la operación `Encrypt`/`Decrypt` directa de KMS (no envelope
 * encryption con una DEK local) porque las credenciales bancarias son
 * pequeñas (muy por debajo del límite de 4KB de KMS) y se cifran/descifran
 * con poca frecuencia (alta al crear/rotar una cuenta, no en cada
 * request) — el costo/latencia extra de una llamada a KMS por operación
 * es aceptable acá y evita la complejidad de manejar DEKs locales.
 *
 * Requiere credenciales de AWS estándar (variables de entorno, rol de
 * IAM de la instancia/task, etc.) — este servicio no las gestiona, usa
 * lo que el SDK de AWS resuelva automáticamente.
 *
 * IMPORTANTE: este provider se instancia SIEMPRE (esté o no
 * `ENCRYPTION_PROVIDER=aws-kms` activo — ver `credentials.module.ts`),
 * porque `CredentialsModule` no sabe en tiempo de wiring cuál de los dos
 * providers se va a usar. Por eso la validación de `AWS_KMS_KEY_ID` NO
 * puede vivir en el constructor ni en `onModuleInit` (rompería el arranque
 * incluso cuando el proveedor activo es el local) — se valida perezosamente,
 * la primera vez que de verdad se llama a `encrypt()`/`decrypt()`.
 */
@Injectable()
export class AwsKmsEncryptionService implements EncryptionPort {
  private readonly client: KMSClient;
  private readonly keyId?: string;

  constructor(configService: ConfigService) {
    this.keyId = configService.get<string>('security.awsKms.keyId');
    this.client = new KMSClient({ region: configService.get<string>('security.awsKms.region') });
  }

  async encrypt(plainText: string): Promise<string> {
    const keyId = this.assertKeyId();
    const result = await this.client.send(new EncryptCommand({ KeyId: keyId, Plaintext: Buffer.from(plainText, 'utf8') }));
    if (!result.CiphertextBlob) {
      throw new Error('AWS KMS no devolvió CiphertextBlob al cifrar');
    }
    return Buffer.from(result.CiphertextBlob).toString('base64');
  }

  async decrypt(cipherText: string): Promise<string> {
    this.assertKeyId(); // KMS ya sabe con qué llave descifrar por el propio ciphertext, pero igual exigimos que el provider esté bien configurado
    const result = await this.client.send(
      new DecryptCommand({ CiphertextBlob: Buffer.from(cipherText, 'base64') }),
    );
    if (!result.Plaintext) {
      throw new Error('AWS KMS no devolvió Plaintext al descifrar');
    }
    return Buffer.from(result.Plaintext).toString('utf8');
  }

  private assertKeyId(): string {
    if (!this.keyId) {
      throw new Error(
        'ENCRYPTION_PROVIDER=aws-kms requiere AWS_KMS_KEY_ID configurado (ARN o alias de la llave de KMS).',
      );
    }
    return this.keyId;
  }
}
