/**
 * Error temporal: timeout, banco caído, red inestable.
 * El Retry & Error Handling debe reprogramar con backoff.
 */
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
