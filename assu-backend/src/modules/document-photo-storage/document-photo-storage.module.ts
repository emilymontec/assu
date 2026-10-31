import { Module } from '@nestjs/common';
import { DOCUMENT_PHOTO_STORAGE_PORT } from '../../core/ports/document-photo-storage.port';
import { CredentialsModule } from '../credentials/credentials.module';
import { LocalDocumentPhotoStorageAdapter } from './adapters/local-document-photo-storage.adapter';

@Module({
  imports: [CredentialsModule], // provee ENCRYPTION_PORT, usado para cifrar el archivo en disco
  providers: [{ provide: DOCUMENT_PHOTO_STORAGE_PORT, useClass: LocalDocumentPhotoStorageAdapter }],
  exports: [DOCUMENT_PHOTO_STORAGE_PORT],
})
export class DocumentPhotoStorageModule {}
