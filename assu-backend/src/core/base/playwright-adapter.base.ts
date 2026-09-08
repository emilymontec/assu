import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { BankCredentials, CollectorAdapter, ExportedSession } from '../ports/collector-adapter.interface';
import { RawMovement } from '../domain/movement/movement.entity';
import { BankUnavailableError, TimeoutError } from '../../common/errors/transient.error';

export interface PlaywrightProxyOptions {
  server: string; // ej. 'http://proxy.provider.com:8000' — server dedicado o proxy residencial
  username?: string;
  password?: string;
}

export interface PlaywrightAdapterOptions {
  headless: boolean;
  timeoutMs: number;
  /**
   * Opcional a propósito: sin esto configurado, el tráfico sale con la
   * IP normal del servidor donde corre Collector. Configurarlo (ver
   * `AdapterFactoryService` + `PLAYWRIGHT_PROXY_*` en `.env`) hace que
   * cada request al banco salga por un proxy dedicado/residencial —
   * reduce (no elimina) el riesgo de que la banca en línea marque el
   * tráfico automatizado como sospechoso.
   */
  proxy?: PlaywrightProxyOptions;
}

/**
 * Base común para adaptadores que se conectan al banco automatizando su
 * portal web con Playwright, ya que este proyecto trabaja SIN apis
 * oficiales de open banking. Cada banco extiende esta clase e implementa
 * únicamente login()/sync() con sus selectores específicos.
 */
export abstract class PlaywrightAdapterBase implements CollectorAdapter {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;

  protected constructor(protected readonly options: PlaywrightAdapterOptions) {}

  abstract login(credentials: BankCredentials): Promise<void>;
  abstract sync(sincePointer?: string | null): Promise<RawMovement[]>;

  protected async openBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        ...(this.options.proxy && { proxy: this.options.proxy }),
      });
      this.context = await this.browser.newContext();
      this.context.setDefaultTimeout(this.options.timeoutMs);
      this.page = await this.context.newPage();
    } catch (err) {
      throw new BankUnavailableError('No se pudo iniciar el navegador para el scraping', err);
    }
  }

  protected async captureFailureEvidence(label: string): Promise<Buffer | null> {
    if (!this.page) return null;
    try {
      return await this.page.screenshot({ fullPage: true });
    } catch {
      return null;
    }
  }

  protected async withTimeout<T>(promise: Promise<T>, timeoutMs = this.options.timeoutMs): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(`Operación excedió ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  async logout(): Promise<void> {
    await this.page?.close().catch(() => undefined);
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  /**
   * Implementación por defecto: exporta las cookies del `BrowserContext`
   * actual. `tokens` queda vacío a propósito — capturar un bearer token
   * específico (si el banco usa uno) es responsabilidad de cada adapter
   * concreto, que puede sobreescribir este método.
   */
  async exportSession(): Promise<ExportedSession> {
    const cookies = this.context ? await this.context.cookies() : [];
    return { cookies: cookies as unknown as Record<string, unknown>[], tokens: {} };
  }

  /**
   * Implementación por defecto: abre un browser/context nuevo e inyecta
   * las cookies guardadas ANTES de navegar a ninguna parte. No verifica
   * que el banco siga aceptando la sesión del lado servidor — eso se
   * descubre en el primer `sync()` real.
   */
  async restoreSession(session: ExportedSession): Promise<void> {
    await this.openBrowser();
    if (session.cookies.length > 0 && this.context) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.context.addCookies(session.cookies as any);
    }
  }
}
