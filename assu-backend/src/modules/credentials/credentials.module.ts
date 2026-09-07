import { Module } from '@nestjs/common';
import { ENCRYPTION_PORT } from '../../core/ports/encryption.port';
import { EncryptionService } from './encryption.service';
import { KeyRotationService } from './key-rotation.service';

@Module({
  providers: [
    KeyRotationService,
    { provide: ENCRYPTION_PORT, useClass: EncryptionService },
  ],
  // Otros módulos (Bank Account Management, futuros) inyectan ENCRYPTION_PORT,
  // nunca EncryptionService directamente — así el resto del sistema depende
  // del contrato (core/ports/encryption.port.ts), no de la implementación AES-256-GCM.
  exports: [ENCRYPTION_PORT],
})
export class CredentialsModule {}
