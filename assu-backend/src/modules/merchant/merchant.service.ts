import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { hash } from 'bcryptjs';
import { MerchantRepository } from './repositories/merchant.repository';
import { Merchant } from '../../core/domain/merchant/merchant.entity';
import { DocumentType } from '../../core/domain/merchant/document-type.enum';
import { DOCUMENT_PHOTO_STORAGE_PORT, DocumentPhotoStoragePort } from '../../core/ports/document-photo-storage.port';

const PASSWORD_SALT_ROUNDS = 12;

export interface RegisterMerchantInput {
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  documentPhoto: { buffer: Buffer; mimeType: string };
}

/**
 * Datos obligatorios del comercio (documento de identidad + datos
 * personales + foto del documento) y la cuenta con la que accede al
 * Portal. No conoce JWT/2FA/dispositivos de confianza — eso es
 * responsabilidad de AuthModule, que depende de este servicio, nunca al
 * revés (evita un ciclo Merchant ↔ Auth).
 */
@Injectable()
export class MerchantService {
  constructor(
    private readonly repository: MerchantRepository,
    @Inject(DOCUMENT_PHOTO_STORAGE_PORT) private readonly documentPhotoStorage: DocumentPhotoStoragePort,
  ) {}

  async register(input: RegisterMerchantInput): Promise<Merchant> {
    const email = input.email.toLowerCase();

    const [existingByEmail, existingByDocument] = await Promise.all([
      this.repository.findByEmail(email),
      this.repository.findByDocument(input.documentType, input.documentNumber),
    ]);

    if (existingByEmail) {
      throw new ConflictException('Ya existe una cuenta registrada con ese correo');
    }
    if (existingByDocument) {
      throw new ConflictException('Ya existe una cuenta registrada con ese documento de identidad');
    }

    const passwordHash = await hash(input.password, PASSWORD_SALT_ROUNDS);

    // El id del comercio se necesita para nombrar el archivo de la foto
    // ANTES de crear el registro — igual que ReceiptIngestionService
    // genera el id del submission antes de guardarlo en storage. Como
    // Merchant usa @default(uuid()) en Prisma, generamos el id acá
    // mismo para poder usarlo en ambos lados de forma consistente.
    const merchantId = randomUUID();
    const documentPhotoStorageRef = await this.documentPhotoStorage.store(
      input.documentPhoto.buffer,
      input.documentPhoto.mimeType,
      merchantId,
    );

    return this.repository.create({
      id: merchantId,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      fullName: input.fullName,
      email,
      phone: input.phone,
      passwordHash,
      documentPhotoStorageRef,
    });
  }

  async findByEmail(email: string): Promise<Merchant | null> {
    return this.repository.findByEmail(email.toLowerCase());
  }

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.repository.findById(id);
    if (!merchant) {
      throw new NotFoundException(`Comercio ${id} no encontrado`);
    }
    return merchant;
  }

  /** Lo usa AuthModule al completar el primer segundo-factor exitoso tras el registro. */
  async markEmailVerified(id: string): Promise<Merchant> {
    return this.repository.markEmailVerified(id);
  }

  /** Lo usa AuthModule al confirmar un token de recuperación de contraseña. */
  async updatePassword(id: string, newPassword: string): Promise<Merchant> {
    const passwordHash = await hash(newPassword, PASSWORD_SALT_ROUNDS);
    return this.repository.updatePassword(id, passwordHash);
  }
}
