import { BankCredentials, CollectorAdapter, ExportedSession } from '../../../core/ports/collector-adapter.interface';
import { RawMovement } from '../../../core/domain/movement/movement.entity';
import { DockerScraperConfig, runScraperContainer } from '../docker-container-runner';

/**
 * Implementación de `CollectorAdapter` que NO ejecuta Playwright en este
 * proceso: delega cada operación a un contenedor Docker desechable
 * (`docker run --rm`, ver `docker/scraper/Dockerfile`), uno por
 * llamada. El contenedor se destruye apenas termina cada operación —
 * nunca queda un contenedor vivo entre `login()` y `sync()`.
 *
 * Esto es un adapter PROXY: no sabe nada de Nequi/Bancolombia/Daviplata
 * en sí — el `adapterKey` viaja en el job y es el `entrypoint.ts` DENTRO
 * del contenedor quien resuelve la clase real vía `ADAPTER_MAP`. Por
 * eso `LoginManagerService`/`SyncEngineService` no necesitan saber que
 * están hablando con un contenedor en vez del adapter real — reciben
 * exactamente el mismo contrato `CollectorAdapter`.
 *
 * La sesión (cookies/tokens) es el "estado" que conecta las llamadas:
 * `login()` la recibe de vuelta del contenedor y la guarda en memoria
 * de ESTE objeto (`this.session`); `sync()`/`logout()` se la mandan de
 * vuelta al contenedor siguiente para que restaure el contexto sin
 * tener que loguear otra vez. Session Manager (Redis) sigue siendo
 * quien persiste la sesión ENTRE ejecuciones de sync completas —
 * `this.session` solo vive mientras dura este objeto (una llamada a
 * `ensureLoggedIn()` de Login Manager).
 */
export class DockerIsolatedAdapter implements CollectorAdapter {
  private session: ExportedSession | null = null;

  constructor(
    private readonly adapterKey: string,
    private readonly dockerConfig: DockerScraperConfig,
  ) {}

  async login(credentials: BankCredentials): Promise<void> {
    const result = await runScraperContainer(this.dockerConfig, {
      action: 'login',
      adapterKey: this.adapterKey,
      credentials,
    });
    this.session = result.ok ? (result.session ?? null) : null;
  }

  async sync(sincePointer?: string | null): Promise<RawMovement[]> {
    const result = await runScraperContainer(this.dockerConfig, {
      action: 'sync',
      adapterKey: this.adapterKey,
      session: this.session,
      sincePointer: sincePointer ?? null,
    });
    return result.ok ? (result.movements ?? []) : [];
  }

  async logout(): Promise<void> {
    await runScraperContainer(this.dockerConfig, {
      action: 'logout',
      adapterKey: this.adapterKey,
      session: this.session,
    });
    this.session = null;
  }

  async exportSession(): Promise<ExportedSession> {
    return this.session ?? { cookies: [], tokens: {} };
  }

  async restoreSession(session: ExportedSession): Promise<void> {
    // Permite que Login Manager reutilice una sesión guardada en Redis
    // de una ejecución de sync ANTERIOR (posiblemente en otro contenedor,
    // ya destruido) sin tener que volver a loguear.
    this.session = session;
  }
}
