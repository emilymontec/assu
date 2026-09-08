import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENCRYPTION_PORT, EncryptionPort } from '../../core/ports/encryption.port';
import { EncryptionService } from './encryption.service';
import { KeyRotationService } from './key-rotation.service';
import { AwsKmsEncryptionService } from './adapters/aws-kms-encryption.service';

@Module({
  providers: [
    KeyRotationService,
    EncryptionService,
    AwsKmsEncryptionService,
    {
      provide: ENCRYPTION_PORT,
      inject: [ConfigService, EncryptionService, AwsKmsEncryptionService],
      // ENCRYPTION_PROVIDER=aws-kms activa AWS KMS; cualquier otro valor
      // (o ausencia) deja el AES-256-GCM local — así el sistema arranca
      // sin credenciales de AWS configuradas.
      useFactory: (
        configService: ConfigService,
        local: EncryptionService,
        awsKms: AwsKmsEncryptionService,
      ): EncryptionPort => (configService.get<string>('security.encryptionProvider') === 'aws-kms' ? awsKms : local),
    },
  ],
  // Otros módulos (Bank Account Management, futuros) inyectan ENCRYPTION_PORT,
  // nunca EncryptionService/AwsKmsEncryptionService directamente — así el
  // resto del sistema depende del contrato (core/ports/encryption.port.ts),
  // no de cuál proveedor de cifrado esté activo.
  exports: [ENCRYPTION_PORT],
})
export class CredentialsModule {}
