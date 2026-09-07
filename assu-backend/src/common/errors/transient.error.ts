export class TransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TransientError';
  }
}

export class TransientLoginError extends TransientError {
  constructor(message = 'Fallo temporal durante el login', cause?: unknown) {
    super(message, cause);
    this.name = 'TransientLoginError';
  }
}

export class BankUnavailableError extends TransientError {
  constructor(message = 'El portal del banco no está disponible', cause?: unknown) {
    super(message, cause);
    this.name = 'BankUnavailableError';
  }
}

export class TimeoutError extends TransientError {
  constructor(message = 'Timeout esperando respuesta del banco', cause?: unknown) {
    super(message, cause);
    this.name = 'TimeoutError';
  }
}

/**
 * Se lanza cuando Rate Limiting (módulo 17) bloquea un intento de sync
 * por exceso de solicitudes (a un banco o a una cuenta puntual). Es
 * TRANSITORIO a propósito: el límite se libera solo con el paso del
 * tiempo, así que Retry & Error Handling debe reintentarlo con backoff,
 * nunca marcarlo como un problema permanente de la cuenta.
 */
export class RateLimitExceededError extends TransientError {
  constructor(message = 'Se alcanzó el límite de solicitudes; intenta de nuevo más tarde', cause?: unknown) {
    super(message, cause);
    this.name = 'RateLimitExceededError';
  }
}
