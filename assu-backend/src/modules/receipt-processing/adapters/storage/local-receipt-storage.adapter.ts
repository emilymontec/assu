import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ReceiptStoragePort } from '../../../../core/ports/receipt-storage.port';

/**
 * Implementación de referencia de `ReceiptStoragePort`. Guarda el
 * archivo en disco bajo una carpeta configurable y devuelve una
 * referencia OPACA (`local:<submissionId>`) — nunca la ruta absoluta —
 * para que nada fuera de este adapter necesite conocer el layout real
 * del filesystem.
 *
 * En un despliegue real esto se reemplaza por un adapter de object
 * storage (S3/GCS) implementando el mismo `ReceiptStoragePort`; el
 * resto del sistema no cambia.
 */
@Injectable()
export class LocalReceiptStorageAdapter implements ReceiptStoragePort {
  private readonly basePath: string;

  constructor(configService: ConfigService) {
    this.basePath = configService.get<string>('receipts.storagePath') ?? './storage/receipts';
  }

  async store(fileBuffer: Buffer, mimeType: string, submissionId: string): Promise<string> {
    await mkdir(this.basePath, { recursive: true });
    const extension = mimeType === 'application/pdf' ? 'pdf' : 'bin';
    const filePath = join(this.basePath, `${submissionId}.${extension}`);
    await writeFile(filePath, fileBuffer);
    return `local:${submissionId}.${extension}`;
  }

  async read(storageRef: string): Promise<Buffer> {
    const fileName = storageRef.replace(/^local:/, '');
    return readFile(join(this.basePath, fileName));
  }
}
