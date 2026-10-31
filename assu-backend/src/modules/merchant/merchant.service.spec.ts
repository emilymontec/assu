jest.mock('./repositories/merchant.repository', () => ({ MerchantRepository: class {} }));

// eslint-disable-next-line import/first
import { ConflictException } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { DocumentType } from '../../core/domain/merchant/document-type.enum';
import { MerchantStatus } from '../../core/domain/merchant/merchant-status.enum';
import { Merchant } from '../../core/domain/merchant/merchant.entity';

function makeMerchant(overrides: Partial<{ id: string; email: string }> = {}): Merchant {
  return new Merchant(
    overrides.id ?? 'merchant-1',
    DocumentType.CC,
    '1098765432',
    'María Pérez',
    overrides.email ?? 'maria@mitienda.co',
    '3001234567',
    'hashed-password',
    'local:merchant-1.jpg.enc',
    MerchantStatus.PENDING_VERIFICATION,
    null,
    new Date(),
    new Date(),
  );
}

describe('MerchantService', () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByDocument: jest.fn(),
    markEmailVerified: jest.fn(),
  };
  const documentPhotoStorage = { store: jest.fn(), read: jest.fn() };

  function buildService() {
    return new MerchantService(repository as any, documentPhotoStorage as any);
  }

  const registerInput = {
    documentType: DocumentType.CC,
    documentNumber: '1098765432',
    fullName: 'María Pérez',
    email: 'Maria@MiTienda.co',
    phone: '3001234567',
    password: 'Contraseña-Segura123',
    documentPhoto: { buffer: Buffer.from('foto'), mimeType: 'image/jpeg' },
  };

  beforeEach(() => jest.clearAllMocks());

  it('rechaza el registro si el correo ya está en uso', async () => {
    repository.findByEmail.mockResolvedValue(makeMerchant());
    repository.findByDocument.mockResolvedValue(null);
    const service = buildService();

    await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza el registro si el documento de identidad ya está registrado', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByDocument.mockResolvedValue(makeMerchant());
    const service = buildService();

    await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('normaliza el correo a minúsculas antes de guardar y de buscar duplicados', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByDocument.mockResolvedValue(null);
    documentPhotoStorage.store.mockResolvedValue('local:some-id.jpg.enc');
    repository.create.mockResolvedValue(makeMerchant());
    const service = buildService();

    await service.register(registerInput);

    expect(repository.findByEmail).toHaveBeenCalledWith('maria@mitienda.co');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'maria@mitienda.co' }));
  });

  it('nunca guarda la contraseña en texto plano', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByDocument.mockResolvedValue(null);
    documentPhotoStorage.store.mockResolvedValue('local:some-id.jpg.enc');
    repository.create.mockResolvedValue(makeMerchant());
    const service = buildService();

    await service.register(registerInput);

    const createCall = repository.create.mock.calls[0][0];
    expect(createCall.passwordHash).not.toBe(registerInput.password);
    expect(createCall.passwordHash).toMatch(/^\$2[aby]\$/); // formato bcrypt
  });

  it('guarda la foto del documento vía DocumentPhotoStoragePort y persiste solo la referencia opaca', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByDocument.mockResolvedValue(null);
    documentPhotoStorage.store.mockResolvedValue('local:abc-123.jpg.enc');
    repository.create.mockResolvedValue(makeMerchant());
    const service = buildService();

    await service.register(registerInput);

    expect(documentPhotoStorage.store).toHaveBeenCalledWith(
      registerInput.documentPhoto.buffer,
      registerInput.documentPhoto.mimeType,
      expect.any(String),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ documentPhotoStorageRef: 'local:abc-123.jpg.enc' }),
    );
  });
});
