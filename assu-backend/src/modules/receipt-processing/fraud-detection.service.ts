import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_SUBMISSION_REPOSITORY_PORT,
  PaymentSubmissionRepositoryPort,
} from '../../core/ports/payment-submission-repository.port';

export interface FraudSignal {
  code: 'FILE_HASH_REUSED';
  detail: string;
}

/**
 * Módulo de señales de fraude (sección 11). Deliberadamente NO decide
 * nada por sí mismo: produce una lista de señales que
 * PaymentVerificationService usa como un factor más al elegir el
 * estado final (típicamente empujando hacia MANUAL_REVIEW en vez de
 * VERIFIED automático). "Tener un indicio de fraude" nunca es
 * suficiente para acusar automáticamente — sección 11 del roadmap.
 *
 * LIMITACIÓN CONOCIDA (documentada a propósito, no un olvido): hoy solo
 * compara el hash exacto (sha256) del archivo, así que una imagen
 * recortada, re-comprimida o con una marca de agua distinta NO se
 * detecta como reutilizada. Cerrar esa brecha requiere hashing
 * perceptual (ej. pHash/dHash sobre el bitmap decodificado), que se
 * deja como extensión de este mismo servicio vía un
 * `PerceptualHashPort` cuando haya volumen que lo justifique — agregarlo
 * hoy sin datos reales sería sobreingeniería (sección 24).
 */
@Injectable()
export class FraudDetectionService {
  constructor(
    @Inject(PAYMENT_SUBMISSION_REPOSITORY_PORT)
    private readonly submissionRepository: PaymentSubmissionRepositoryPort,
  ) {}

  async collectSignals(fileHash: string): Promise<FraudSignal[]> {
    const signals: FraudSignal[] = [];

    const alreadySubmitted = await this.submissionRepository.existsByFileHash(fileHash);
    if (alreadySubmitted) {
      signals.push({
        code: 'FILE_HASH_REUSED',
        detail: 'Ya existe un comprobante previo con el mismo archivo (hash idéntico).',
      });
    }

    return signals;
  }
}
