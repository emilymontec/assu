import { BankCredentials, ExportedSession } from '../core/ports/bank-adapter.interface';
import { RawMovement } from '../core/domain/movement/movement.entity';

export type ScraperAction = 'login' | 'sync' | 'logout';

/**
 * Job que el host (`DockerIsolatedAdapter`) escribe en el stdin del
 * contenedor. Va SOLO por stdin — nunca como argumento de `docker run`
 * ni como variable de entorno del contenedor — porque ambos quedan
 * visibles vía `ps aux` / `docker inspect` en el host; stdin no queda
 * en ningún lado una vez el proceso termina.
 */
export interface ScraperJob {
  action: ScraperAction;
  adapterKey: string;
  /** Solo se manda en `action: 'login'`. */
  credentials?: BankCredentials;
  /** Sesión previa a restaurar; ausente en el primer login de una cuenta. */
  session?: ExportedSession | null;
  /** Solo relevante en `action: 'sync'`. */
  sincePointer?: string | null;
}

export interface ScraperSuccessResult {
  ok: true;
  /** Presente tras `login`: la sesión nueva que el host debe persistir. */
  session?: ExportedSession;
  /** Presente tras `sync`. */
  movements?: RawMovement[];
}

export interface ScraperErrorResult {
  ok: false;
  error: {
    /** Nombre de la clase de error real (`InvalidCredentialsError`, etc.) — ver ERROR_TYPE_MAP en docker-isolated.adapter.ts. */
    type: string;
    message: string;
  };
}

export type ScraperResult = ScraperSuccessResult | ScraperErrorResult;
