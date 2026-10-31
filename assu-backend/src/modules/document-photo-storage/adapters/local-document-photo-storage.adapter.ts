import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { DocumentPhotoStoragePort } from '../../../core/ports/document-photo-storage.port';
import { ENCRYPTION_PORT, EncryptionPort } from '../../../core/ports/encryption.port';

/**
 * Implementación de referencia de DocumentPhotoStoragePort — mismo
 * patrón que LocalReceiptStorageAdapter (disco local, referencia
 * OPACA), pero el archivo se cifra con el mismo EncryptionPort de
 * credenciales bancarias antes de escribirse: una foto de cédula es un
 * documento de identidad, no un comprobante de pago, y merece el mismo
 * cuidado que una credencial. En producción se reemplaza por un adapter
 * de object storage (S3/GCS) que implemente el mismo puerto, cifrando
 * igual antes de subir — el resto del sistema no cambia.
 */
@Injectable()
export class LocalDocumentPhotoStorageAdapter implements DocumentPhotoStoragePort {
  private readonly basePath: string;

  constructor(
    configService: ConfigService,
    @Inject(ENCRYPTION_PORT) private readonly encryption: EncryptionPort,
  ) {
    this.basePath = configService.get<string>('documentPhotos.storagePath') ?? './storage/document-photos';
  }

  async store(fileBuffer: Buffer, mimeType: string, merchantId: string): Promise<string> {
    await mkdir(this.basePath, { recursive: true });
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const encryptedPayload = await this.encryption.encrypt(fileBuffer.toString('base64'));
    const filePath = join(this.basePath, `${merchantId}.${extension}.enc`);
    await writeFile(filePath, encryptedPayload, 'utf8');
    return `local:${merchantId}.${extension}.enc`;
  }

  async read(storageRef: string): Promise<Buffer> {
    const fileName = storageRef.replace(/^local:/, '');
    const encryptedPayload = await readFile(join(this.basePath, fileName), 'utf8');
    const base64 = await this.encryption.decrypt(encryptedPayload);
    return Buffer.from(base64, 'base64');
  }
}
