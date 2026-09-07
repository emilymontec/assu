import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { KeyRotationService } from './key-rotation.service';

/** Config fake mínima: solo necesitamos que `.get()` devuelva lo que le pongamos. */
function makeConfigService(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function buildEncryptionService(current: string, previous?: string): EncryptionService {
  const keyRotation = new KeyRotationService(
    makeConfigService({
      'security.credentialsEncryptionKey': current,
      'security.credentialsEncryptionKeyPrevious': previous,
    }),
  );
  keyRotation.onModuleInit();
  return new EncryptionService(keyRotation);
}

describe('EncryptionService (AES-256-GCM)', () => {
  const keyA = randomBytes(32).toString('hex');
  const keyB = randomBytes(32).toString('hex');

  it('descifra exactamente lo que cifró (round-trip)', async () => {
    const service = buildEncryptionService(keyA);
    const plainText = 'usuario:demo;password:S3cr3t0!';

    const cipherText = await service.encrypt(plainText);
    const decrypted = await service.decrypt(cipherText);

    expect(decrypted).toBe(plainText);
  });

  it('nunca genera el mismo ciphertext dos veces para el mismo texto (IV aleatorio)', async () => {
    const service = buildEncryptionService(keyA);
    const plainText = 'mismo-texto';

    const first = await service.encrypt(plainText);
    const second = await service.encrypt(plainText);

    expect(first).not.toBe(second);
    // Pero ambos deben seguir descifrando al mismo valor original.
    expect(await service.decrypt(first)).toBe(plainText);
    expect(await service.decrypt(second)).toBe(plainText);
  });

  it('el ciphertext incluye el fingerprint de la clave usada', async () => {
    const service = buildEncryptionService(keyA);
    const cipherText = await service.encrypt('algo');

    expect(cipherText).toMatch(/^[0-9a-f]{8}:/);
  });

  it('rechaza un ciphertext manipulado en vez de devolver datos corruptos silenciosamente', async () => {
    const service = buildEncryptionService(keyA);
    const cipherText = await service.encrypt('dato-sensible');

    const [fingerprint, payload] = cipherText.split(':');
    const tamperedPayload = Buffer.from(payload, 'base64');
    tamperedPayload[tamperedPayload.length - 1] ^= 0xff; // voltea el último byte
    const tampered = `${fingerprint}:${tamperedPayload.toString('base64')}`;

    await expect(service.decrypt(tampered)).rejects.toThrow();
  });

  it('rechaza un ciphertext sin fingerprint (formato inválido)', async () => {
    const service = buildEncryptionService(keyA);
    await expect(service.decrypt('esto-no-tiene-separador')).rejects.toThrow(/formato/i);
  });

  it('permite rotar de clave sin perder acceso a datos cifrados con la clave anterior', async () => {
    const beforeRotation = buildEncryptionService(keyA);
    const oldCipherText = await beforeRotation.encrypt('credencial-antigua');

    // Tras la rotación: keyA pasa a ser "previous", keyB es la nueva "current".
    const afterRotation = buildEncryptionService(keyB, keyA);

    // Los datos viejos se siguen pudiendo leer...
    expect(await afterRotation.decrypt(oldCipherText)).toBe('credencial-antigua');

    // ...pero los datos NUEVOS ya usan la clave nueva (fingerprint distinto).
    const newCipherText = await afterRotation.encrypt('credencial-nueva');
    expect(newCipherText.split(':')[0]).not.toBe(oldCipherText.split(':')[0]);
  });

  it('lanza un error claro si la clave no se reconoce (rotación incompleta)', async () => {
    const service = buildEncryptionService(keyA);
    const cipherText = await service.encrypt('dato');

    // Simula que alguien quitó CREDENTIALS_ENCRYPTION_KEY_PREVIOUS demasiado pronto.
    const serviceSinClaveVieja = buildEncryptionService(keyB);

    await expect(serviceSinClaveVieja.decrypt(cipherText)).rejects.toThrow(/no se encontró la clave/i);
  });
});
