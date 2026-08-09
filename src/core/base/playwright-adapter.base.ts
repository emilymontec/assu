import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { BankCredentials, CollectorAdapter } from '../ports/collector-adapter.interface';
import { RawMovement } from '../domain/movement/movement.entity';
import { BankUnavailableError, TimeoutError } from '../../common/errors/transient.error';

export interface PlaywrightAdapterOptions {
  headless: boolean;
  timeoutMs: number;
}

/**
 * Base común para adaptadores que se conectan al banco automatizando su
 * portal web con Playwright, ya que este proyecto trabaja SIN apis oficiales
 * de open banking.
 *
 * Cada banco (Nequi, Bancolombia, Davivienda, ...) extiende esta clase e
 * implementa únicamente `login()` y `sync()` con sus selectores/flujos
 * específicos; el manejo de browser/context/errores queda centralizado aquí.
 *
 * IMPORTANTE: esta clase es una base reutilizable, no un adapter en sí.
 * Los adapters concretos se agregan en el módulo `bank-adapter` (Sprint 5
 * del roadmap / módulo 3 - Bank Adapter System).
 */
export abstract class PlaywrightAdapterBase implements CollectorAdapter {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;

  protected constructor(protected readonly options: PlaywrightAdapterOptions) {}

  /** Cada banco define su propio flujo de login sobre `this.page`. */
  abstract login(credentials: BankCredentials): Promise<void>;

  /** Cada banco define cómo extraer los movimientos crudos de su portal. */
  abstract sync(sincePointer?: string | null): Promise<RawMovement[]>;

  protected async openBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({ headless: this.options.headless });
      this.context = await this.browser.newContext();
      this.context.setDefaultTimeout(this.options.timeoutMs);
      this.page = await this.context.newPage();
    } catch (err) {
      throw new BankUnavailableError('No se pudo iniciar el navegador para el scraping', err);
    }
  }

  /** Captura de pantalla en el momento del fallo, útil para diagnosticar cambios de portal. */
  protected async captureFailureEvidence(label: string): Promise<Buffer | null> {
    if (!this.page) return null;
    try {
      return await this.page.screenshot({ fullPage: true });
    } catch {
      return null; // la evidencia es "best effort", nunca debe tumbar el flujo principal
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
}
