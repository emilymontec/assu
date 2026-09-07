export class PermanentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PermanentError';
  }
}

export class InvalidCredentialsError extends PermanentError {
  constructor(message = 'Credenciales inválidas o revocadas', cause?: unknown) {
    super(message, cause);
    this.name = 'InvalidCredentialsError';
  }
}

export class PortalStructureChangedError extends PermanentError {
  constructor(message = 'El portal del banco cambió su estructura; el parser/selector ya no coincide', cause?: unknown) {
    super(message, cause);
    this.name = 'PortalStructureChangedError';
  }
}
