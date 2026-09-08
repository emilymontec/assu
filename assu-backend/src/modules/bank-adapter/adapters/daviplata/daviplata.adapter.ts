import { BankCredentials } from '../../../../core/ports/collector-adapter.interface';
import { RawMovement } from '../../../../core/domain/movement/movement.entity';
import { PlaywrightAdapterBase, PlaywrightAdapterOptions } from '../../../../core/base/playwright-adapter.base';
import { InvalidCredentialsError, PortalStructureChangedError } from '../../../../common/errors/permanent.error';

/**
 * ⚠️ SELECTORES Y URLS PLACEHOLDER — NO DESPLEGAR TAL CUAL A PRODUCCIÓN.
 *
 * Igual que `NequiAdapter`/`BancolombiaAdapter`: la Fase 0 (investigación
 * real del portal) todavía no se hizo para Daviplata. Sigue la misma
 * metodología de `docs/fase-0-nequi.md` — solo cambian las constantes
 * de abajo.
 *
 * Daviplata es la billetera móvil de Davivienda (equivalente a lo que
 * Nequi es para Bancolombia), no la Sucursal Virtual tradicional del
 * banco — por eso el login se modela con `phone` + `password`, igual
 * que `NequiAdapter`, y no con documento+clave como un portal bancario
 * clásico. A confirmar en la Fase 0 real: si Daviplata pide una clave
 * dinámica u OTP en logins desde un dispositivo/IP nuevo (rompería el
 * login desatendido, igual que se documenta para Nequi en la sección de
 * MFA de `docs/fase-0-nequi.md`), y si el acceso es solo vía app móvil
 * (sin versión web), en cuyo caso Playwright tendría que automatizar un
 * emulador Android/WebView en vez de un navegador de escritorio — un
 * cambio de enfoque más grande que un simple ajuste de selectores.
 */
const DAVIPLATA_LOGIN_URL = 'https://www.daviplata.com/login'; // TODO: confirmar URL/canal real (¿web o solo app?)
const DAVIPLATA_MOVEMENTS_URL = 'https://www.daviplata.com/movimientos'; // TODO: confirmar URL real

const SELECTORS = {
  phoneInput: '#TODO-phone-input',
  passwordInput: '#TODO-password-input',
  submitButton: '#TODO-submit-button',
  loginErrorMessage: '.TODO-login-error-message',
  homeIndicator: '.TODO-home-loaded-indicator',
  movementsList: '.TODO-movements-list',
  movementRow: '.TODO-movement-row',
} as const;

export class DaviplataAdapter extends PlaywrightAdapterBase {
  constructor(options: PlaywrightAdapterOptions) {
    super(options);
  }

  /** Espera `credentials.phone` y `credentials.password`. */
  async login(credentials: BankCredentials): Promise<void> {
    await this.openBrowser();
    const page = this.page!;

    try {
      await page.goto(DAVIPLATA_LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await page.fill(SELECTORS.phoneInput, credentials.phone);
      await page.fill(SELECTORS.passwordInput, credentials.password);
      await page.click(SELECTORS.submitButton);

      // Misma carrera éxito-vs-error que en los otros adapters.
      const outcome = await Promise.race([
        page
          .waitForSelector(SELECTORS.loginErrorMessage, { timeout: this.options.timeoutMs })
          .then(() => 'error' as const)
          .catch(() => null),
        page
          .waitForSelector(SELECTORS.homeIndicator, { timeout: this.options.timeoutMs })
          .then(() => 'success' as const)
          .catch(() => null),
      ]);

      if (outcome === 'error') {
        const message = await page.textContent(SELECTORS.loginErrorMessage);
        throw new InvalidCredentialsError(message?.trim() || 'Daviplata rechazó las credenciales');
      }

      if (outcome !== 'success') {
        throw new PortalStructureChangedError(
          'Ni el indicador de éxito ni el mensaje de error aparecieron tras el login en Daviplata',
        );
      }
    } catch (err) {
      await this.captureFailureEvidence('daviplata-login-failure');
      if (err instanceof InvalidCredentialsError || err instanceof PortalStructureChangedError) {
        throw err;
      }
      throw new PortalStructureChangedError(
        'Error inesperado durante el login en Daviplata (posible cambio de portal)',
        err,
      );
    }
  }

  async sync(sincePointer?: string | null): Promise<RawMovement[]> {
    if (!this.page) {
      throw new Error('DaviplataAdapter.sync() fue llamado sin haber iniciado sesión (ejecuta login() primero)');
    }
    const page = this.page;

    try {
      await page.goto(DAVIPLATA_MOVEMENTS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(SELECTORS.movementsList, { timeout: this.options.timeoutMs });

      // Formato NATIVO de Daviplata, sin normalizar — eso es trabajo de
      // `daviplata.parser.ts` (Movement Parser), no de este adapter.
      const rawRows = await page.$$eval(SELECTORS.movementRow, (rows: Element[]) =>
        rows.map((row) => ({
          fecha: row.querySelector('.TODO-date')?.textContent?.trim() ?? null,
          monto: row.querySelector('.TODO-amount')?.textContent?.trim() ?? null,
          descripcion: row.querySelector('.TODO-description')?.textContent?.trim() ?? null,
          referencia: row.querySelector('.TODO-reference')?.textContent?.trim() ?? null,
        })),
      );

      if (!sincePointer) {
        return rawRows;
      }

      const cutoffIndex = rawRows.findIndex((row) => row.referencia === sincePointer);
      return cutoffIndex === -1 ? rawRows : rawRows.slice(0, cutoffIndex);
    } catch (err) {
      await this.captureFailureEvidence('daviplata-sync-failure');
      throw new PortalStructureChangedError(
        'No se pudieron leer los movimientos en Daviplata (posible cambio de portal)',
        err,
      );
    }
  }
}
