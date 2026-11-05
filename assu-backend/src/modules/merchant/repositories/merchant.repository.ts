import { Injectable } from '@nestjs/common';
import type { Merchant as PrismaMerchant } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { Merchant } from '../../../core/domain/merchant/merchant.entity';
import { DocumentType } from '../../../core/domain/merchant/document-type.enum';
import { MerchantStatus } from '../../../core/domain/merchant/merchant-status.enum';

function toDomain(record: PrismaMerchant): Merchant {
  return new Merchant(
    record.id,
    record.documentType as DocumentType,
    record.documentNumber,
    record.fullName,
    record.email,
    record.phone,
    record.passwordHash,
    record.documentPhotoStorageRef,
    record.status as MerchantStatus,
    record.emailVerifiedAt,
    record.createdAt,
    record.updatedAt,
  );
}

export interface CreateMerchantData {
  // Se genera ANTES de llamar a create() porque MerchantService necesita
  // el id para nombrar el archivo de la foto en DocumentPhotoStoragePort
  // (mismo patrón que PaymentSubmission/ReceiptIngestionService).
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  documentPhotoStorageRef: string;
}

@Injectable()
export class MerchantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMerchantData): Promise<Merchant> {
    const record = await this.prisma.merchant.create({ data });
    return toDomain(record);
  }

  async findById(id: string): Promise<Merchant | null> {
    const record = await this.prisma.merchant.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<Merchant | null> {
    const record = await this.prisma.merchant.findUnique({ where: { email: email.toLowerCase() } });
    return record ? toDomain(record) : null;
  }

  async findByDocument(documentType: DocumentType, documentNumber: string): Promise<Merchant | null> {
    const record = await this.prisma.merchant.findUnique({
      where: { uniq_document_type_number: { documentType, documentNumber } },
    });
    return record ? toDomain(record) : null;
  }

  async markEmailVerified(id: string): Promise<Merchant> {
    const record = await this.prisma.merchant.update({
      where: { id },
      data: { emailVerifiedAt: new Date(), status: MerchantStatus.ACTIVE },
    });
    return toDomain(record);
  }

  async updatePassword(id: string, passwordHash: string): Promise<Merchant> {
    const record = await this.prisma.merchant.update({ where: { id }, data: { passwordHash } });
    return toDomain(record);
  }
}
