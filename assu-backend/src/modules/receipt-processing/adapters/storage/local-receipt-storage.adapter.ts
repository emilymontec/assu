import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ReceiptStoragePort } from '../../../../core/ports/receipt-storage.port';

/**
 * Implementación de referencia de ReceiptStoragePort — mismo patrón que
 * LocalDocumentPhotoStorageAdapter (disco local, referencia OPACA),
 * pero SIN cifrar: el comprobante se guarda tal cual llegó porque el
 * pipeline de OCR necesita los bytes crudos y el archivo en sí no es
 * una credencial ni un documento de identidad. La referencia que se
 * devuelve (`local:<archivo>`) es opaca a propósito: nadie fuera de
 * este adapter reconstruye la ruta real al filesystem. En producción se
 * reemplaza por un adapter de object storage (S3/GCS) que implemente el
 * mismo puerto — el resto del sistema no cambia.
 */
@Injectable()
export class LocalReceiptStorageAdapter implements ReceiptStoragePort {
  private readonly basePath: string;

  constructor(configService: ConfigService) {
    this.basePath = configService.get<string>('receipts.storagePath') ?? './storage/receipts';
  }

  async store(fileBuffer: Buffer, mimeType: string, submissionId: string): Promise<string> {
    await mkdir(this.basePath, { recursive: true });
    const fileName = `${submissionId}${this.extensionFor(mimeType)}`;
    await writeFile(join(this.basePath, fileName), fileBuffer);
    return `local:${fileName}`;
  }

  async read(storageRef: string): Promise<Buffer> {
    const fileName = storageRef.replace(/^local:/, '');
    return readFile(join(this.basePath, fileName));
  }

  private extensionFor(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      default:
        return '.jpg';
    }
  }
}
