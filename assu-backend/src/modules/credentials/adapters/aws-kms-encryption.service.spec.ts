import { ConfigService } from '@nestjs/config';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  EncryptCommand: jest.fn().mockImplementation((input) => ({ __type: 'Encrypt', input })),
  DecryptCommand: jest.fn().mockImplementation((input) => ({ __type: 'Decrypt', input })),
}));

// eslint-disable-next-line import/first
import { AwsKmsEncryptionService } from './aws-kms-encryption.service';

function makeConfigService(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('AwsKmsEncryptionService', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  function buildService(keyId: string | undefined = 'arn:aws:kms:us-east-1:123456789012:key/fake'): AwsKmsEncryptionService {
    return new AwsKmsEncryptionService(
      makeConfigService({ 'security.awsKms.region': 'us-east-1', 'security.awsKms.keyId': keyId }),
    );
  }

  it('encrypt() envía el texto plano a KMS y devuelve el CiphertextBlob en base64', async () => {
    sendMock.mockResolvedValue({ CiphertextBlob: Buffer.from('fake-ciphertext') });
    const service = buildService();

    const result = await service.encrypt('phone:3001234567;pin:5678');

    expect(result).toBe(Buffer.from('fake-ciphertext').toString('base64'));
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        __type: 'Encrypt',
        input: expect.objectContaining({ KeyId: 'arn:aws:kms:us-east-1:123456789012:key/fake' }),
      }),
    );
  });

  it('decrypt() manda el ciphertext (decodificado de base64) a KMS y devuelve el texto plano', async () => {
    const plainBuffer = Buffer.from('phone:3001234567;pin:5678');
    sendMock.mockResolvedValue({ Plaintext: plainBuffer });
    const service = buildService();

    const result = await service.decrypt(Buffer.from('algo').toString('base64'));

    expect(result).toBe(plainBuffer.toString('utf8'));
  });

  it('encrypt() nunca hace la llamada a KMS y falla rápido si falta AWS_KMS_KEY_ID', async () => {
    const service = buildService('');

    await expect(service.encrypt('x')).rejects.toThrow(/AWS_KMS_KEY_ID/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('decrypt() también falla rápido si falta AWS_KMS_KEY_ID', async () => {
    const service = buildService('');

    await expect(service.decrypt('x')).rejects.toThrow(/AWS_KMS_KEY_ID/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('propaga un error claro si KMS responde sin CiphertextBlob', async () => {
    sendMock.mockResolvedValue({});
    const service = buildService();

    await expect(service.encrypt('x')).rejects.toThrow(/CiphertextBlob/);
  });

  it('propaga un error claro si KMS responde sin Plaintext', async () => {
    sendMock.mockResolvedValue({});
    const service = buildService();

    await expect(service.decrypt('x')).rejects.toThrow(/Plaintext/);
  });
});
