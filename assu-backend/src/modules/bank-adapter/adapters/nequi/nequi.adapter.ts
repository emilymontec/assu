import { BankCredentials } from '../../../../core/ports/bank-adapter.interface';
import { RawMovement } from '../../../../core/domain/movement/movement.entity';
import { PlaywrightAdapterBase, PlaywrightAdapterOptions } from '../../../../core/base/playwright-adapter.base';
import { InvalidCredentialsError, PortalStructureChangedError } from '../../../../common/errors/permanent.error';

/**
 * ⚠️ SELECTORES Y URLS PLACEHOLDER — NO DESPLEGAR TAL CUAL A PRODUCCIÓN.
 *
 * La Fase 0 del roadmap (investigación por banco) para Nequi todavía no
 * se ha hecho — ver docs/fase-0-nequi.md. Antes de usar este
 * adapter contra el portal real hace falta:
 *
 *   1. Abrir el portal/app real de Nequi con las DevTools abiertas y
 *      confirmar los selectores exactos de cada campo (cambian con el
 *      tiempo, no se pueden adivinar de antemano).
 *   2. Verificar si hay 2FA/OTP que rompa el login automatizado directo.
 *   3. Revisar los términos de uso de Nequi respecto a automatización de
 *      terceros, y la normativa de datos personales aplicable.
 *
 * Lo que SÍ está completo y es reutilizable para cualquier banco futuro:
 * el flujo login→detectar éxito/error→sync→extraer filas→cortar por
 * puntero, el manejo de errores transitorios/permanentes, y la captura
 * de evidencia ante fallos. Un desarrollador solo necesita reemplazar
 * las constantes de abajo tras inspeccionar el portal real.
 */
const NEQUI_LOGIN_URL = 'https://transacciones.nequi.com/bdigital/login.jsp';
const NEQUI_MOVEMENTS_URL = 'https://www.nequi.com.co/movimientos'; // TODO: confirmar URL real

const SELECTORS = {
  phoneInput: '#TODO-phone-input',
  pinInput: '#TODO-pin-input',
  submitButton: '#TODO-submit-button',
  loginErrorMessage: '.TODO-login-error-message',
  homeIndicator: '.TODO-home-loaded-indicator',
  movementsList: '.TODO-movements-list',
  movementRow: '.TODO-movement-row',
} as const;

export class NequiAdapter extends PlaywrightAdapterBase {
  constructor(options: PlaywrightAdapterOptions) {
    super(options);
  }

  async login(credentials: BankCredentials): Promise<void> {
    await this.openBrowser();
    const page = this.page!;

    try {
      await page.goto(NEQUI_LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await page.fill(SELECTORS.phoneInput, credentials.phone);
      await page.fill(SELECTORS.pinInput, credentials.pin);
      await page.click(SELECTORS.submitButton);

      // Carrera entre "apareció el error" y "apareció el home": lo que
      // llegue primero nos dice si el login funcionó, sin adivinar tiempos fijos.
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
        throw new InvalidCredentialsError(message?.trim() || 'Nequi rechazó las credenciales');
      }

      if (outcome !== 'success') {
        throw new PortalStructureChangedError(
          'Ni el indicador de éxito ni el mensaje de error aparecieron tras el login en Nequi',
        );
      }
    } catch (err) {
      await this.captureFailureEvidence('nequi-login-failure');
      if (err instanceof InvalidCredentialsError || err instanceof PortalStructureChangedError) {
        throw err;
      }
      throw new PortalStructureChangedError(
        'Error inesperado durante el login en Nequi (posible cambio de portal)',
        err,
      );
    }
  }

  async sync(sincePointer?: string | null): Promise<RawMovement[]> {
    if (!this.page) {
      throw new Error('NequiAdapter.sync() fue llamado sin haber iniciado sesión (ejecuta login() primero)');
    }
    const page = this.page;

    try {
      await page.goto(NEQUI_MOVEMENTS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(SELECTORS.movementsList, { timeout: this.options.timeoutMs });

      // Se extrae en el formato NATIVO de Nequi (nombres de campo en
      // español, sin normalizar). Convertir esto al `Movement` estándar
      // es responsabilidad del Movement Parser (módulo 8), no de este adapter.
      const rawRows = await page.$$eval(SELECTORS.movementRow, (rows: Element[]) =>
        rows.map((row) => ({
          fecha: row.querySelector('.TODO-date')?.textContent?.trim() ?? null,
          monto: row.querySelector('.TODO-amount')?.textContent?.trim() ?? null,
          referencia: row.querySelector('.TODO-reference')?.textContent?.trim() ?? null,
          descripcion: row.querySelector('.TODO-description')?.textContent?.trim() ?? null,
        })),
      );

      if (!sincePointer) {
        return rawRows;
      }

      // Los movimientos vienen del más reciente al más antiguo; cortamos
      // justo antes del último que ya conocíamos (evita releer historial completo).
      const cutoffIndex = rawRows.findIndex((row) => row.referencia === sincePointer);
      return cutoffIndex === -1 ? rawRows : rawRows.slice(0, cutoffIndex);
    } catch (err) {
      await this.captureFailureEvidence('nequi-sync-failure');
      throw new PortalStructureChangedError('No se pudieron leer los movimientos en Nequi (posible cambio de portal)', err);
    }
  }
}
