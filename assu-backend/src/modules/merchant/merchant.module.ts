import { Module } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { MerchantRepository } from './repositories/merchant.repository';
import { DocumentPhotoStorageModule } from '../document-photo-storage/document-photo-storage.module';

@Module({
  imports: [DocumentPhotoStorageModule],
  providers: [MerchantService, MerchantRepository],
  exports: [MerchantService],
})
export class MerchantModule {}
