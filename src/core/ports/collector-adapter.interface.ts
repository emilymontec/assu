import { RawMovement } from '../domain/movement/movement.entity';

/**
 * Credenciales YA DESCIFRADAS de una cuenta, entregadas al adapter
 * únicamente en el momento del login. El adapter nunca debe persistirlas
 * ni loguearlas.
 */
export interface BankCredentials {
  [key: string]: string; // ej: { username, password } o { phone, pin }
}

/**
 * Contrato que TODO banco debe implementar para integrarse al Collector.
 *
 * Este proyecto no usa APIs oficiales de open banking: la implementación
 * concreta de cada método normalmente se apoya en Playwright (ver
 * `PlaywrightAdapterBase`), interceptación de tráfico móvil, o lectura de
 * archivos exportados — pero el resto del sistema (Sync Engine, Scheduler,
 * Movement Parser, etc.) solo conoce esta interfaz.
 */
export interface CollectorAdapter {
  /**
   * Autentica contra el banco. Debe lanzar `InvalidCredentialsError`
   * (permanente) o `TransientLoginError` (temporal) según corresponda.
   */
  login(credentials: BankCredentials): Promise<void>;

  /**
   * Obtiene los movimientos del banco desde `sincePointer` (puntero opuesto,
   * normalmente `lastMovementReference` de la cuenta) hasta el más reciente.
   * Retorna los movimientos SIN normalizar: eso lo hace el Movement Parser.
   */
  sync(sincePointer?: string | null): Promise<RawMovement[]>;

  /** Cierra sesión y libera cualquier recurso (browser context, tokens, etc.). */
  logout(): Promise<void>;
}

/**
 * Identifica de forma única qué adapter concreto debe usarse.
 * Coincide con `Bank.adapterKey` (ver core/domain/bank).
 */
export const COLLECTOR_ADAPTER_REGISTRY = Symbol('COLLECTOR_ADAPTER_REGISTRY');
