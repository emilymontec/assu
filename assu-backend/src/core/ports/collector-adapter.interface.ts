import { RawMovement } from '../domain/movement/movement.entity';

export interface BankCredentials {
  [key: string]: string;
}

export interface ExportedSession {
  cookies: Record<string, unknown>[];
  tokens: Record<string, string>;
}

/**
 * Contrato que TODO banco debe implementar para integrarse al Collector.
 * Este proyecto no usa APIs oficiales de open banking: la implementación
 * concreta normalmente se apoya en Playwright, interceptación de tráfico
 * móvil, o lectura de archivos exportados.
 */
export interface CollectorAdapter {
  login(credentials: BankCredentials): Promise<void>;
  sync(sincePointer?: string | null): Promise<RawMovement[]>;
  logout(): Promise<void>;

  /**
   * Opcional: exporta cookies/tokens tras un login exitoso, para que
   * Session Manager los guarde y se puedan reutilizar sin loguear de
   * nuevo. `PlaywrightAdapterBase` ya da una implementación por defecto
   * basada en las cookies del `BrowserContext`.
   */
  exportSession?(): Promise<ExportedSession>;

  /**
   * Opcional: restaura una sesión guardada en un browser/context nuevo,
   * evitando repetir el formulario de login. Esto NO garantiza que el
   * banco siga aceptando la sesión del lado servidor — quien la use debe
   * estar preparado para que el primer `sync()` falle y haya que
   * reautenticar (esa lógica de reintento vive en Sync Engine, no aquí).
   */
  restoreSession?(session: ExportedSession): Promise<void>;
}

export const COLLECTOR_ADAPTER_REGISTRY = Symbol('COLLECTOR_ADAPTER_REGISTRY');
