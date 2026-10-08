import { BankCredentials } from '../../../../core/ports/bank-adapter.interface';
import { RawMovement } from '../../../../core/domain/movement/movement.entity';
import { PlaywrightAdapterBase, PlaywrightAdapterOptions } from '../../../../core/base/playwright-adapter.base';
import { InvalidCredentialsError, PortalStructureChangedError } from '../../../../common/errors/permanent.error';

/**
 * ⚠️ SELECTORES Y URLS PLACEHOLDER — NO DESPLEGAR TAL CUAL A PRODUCCIÓN.
 *
 * Igual que `NequiAdapter`: la Fase 0 (investigación real del portal)
 * todavía no se hizo. Sigue la misma metodología documentada en
 * `docs/fase-0-nequi.md` (preguntas legales, `playwright codegen`,
 * cómo elegir selectores estables) — ese documento no es específico de
 * Nequi, aplica igual acá; solo cambian las constantes de abajo.
 *
 * RIESGO ADICIONAL A VALIDAR EN LA INVESTIGACIÓN REAL (específico de
 * Bancolombia, no presente en Nequi): la Sucursal Virtual de
 * Bancolombia históricamente pide la clave a través de un TECLADO
 * VIRTUAL con posiciones que cambian en cada intento (para dificultar
 * keyloggers), en vez de un `<input>` de texto normal. Si eso sigue
 * siendo así, `page.fill(SELECTORS.passwordInput, ...)` de abajo NO
 * va a funcionar — hay que reemplazarlo por lógica que ubique cada
 * dígito en el teclado virtual y haga clic, lo cual es notablemente
 * más frágil ante cambios de UI que un login por texto plano. Confirmar
 * esto es el primer paso de la Fase 0 para este banco, antes de asumir
 * que el resto del flujo de abajo sirve tal cual.
 */
const BANCOLOMBIA_LOGIN_URL = 'https://www.bancolombia.com/login'; // TODO: confirmar URL real de la Sucursal Virtual
const BANCOLOMBIA_MOVEMENTS_URL = 'https://www.bancolombia.com/movimientos'; // TODO: confirmar URL real

const SELECTORS = {
  documentTypeSelect: '#TODO-document-type-select',
  documentNumberInput: '#TODO-document-number-input',
  continueButton: '#TODO-continue-button',
  // TODO: ver advertencia arriba — puede que esto deba ser un flujo de
  // clics sobre un teclado virtual en vez de un input de texto normal.
  passwordInput: '#TODO-password-input',
  submitButton: '#TODO-submit-button',
  loginErrorMessage: '.TODO-login-error-message',
  homeIndicator: '.TODO-home-loaded-indicator',
  movementsList: '.TODO-movements-list',
  movementRow: '.TODO-movement-row',
} as const;

export class BancolombiaAdapter extends PlaywrightAdapterBase {
  constructor(options: PlaywrightAdapterOptions) {
    super(options);
  }

  /**
   * Espera `credentials.documentNumber` y `credentials.password`.
   * `credentials.documentType` es opcional (por defecto "CC" — cédula
   * de ciudadanía, el tipo de documento más común); banco corporativos
   * u otros tipos de cuenta pueden requerir NIT u otro valor.
   */
  async login(credentials: BankCredentials): Promise<void> {
    await this.openBrowser();
    const page = this.page!;

    try {
      await page.goto(BANCOLOMBIA_LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await page.selectOption(SELECTORS.documentTypeSelect, credentials.documentType ?? 'CC');
      await page.fill(SELECTORS.documentNumberInput, credentials.documentNumber);
      await page.click(SELECTORS.continueButton);

      await page.fill(SELECTORS.passwordInput, credentials.password);
      await page.click(SELECTORS.submitButton);

      // Misma carrera éxito-vs-error que NequiAdapter: lo que aparezca
      // primero decide, en vez de asumir tiempos fijos.
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
        throw new InvalidCredentialsError(message?.trim() || 'Bancolombia rechazó las credenciales');
      }

      if (outcome !== 'success') {
        throw new PortalStructureChangedError(
          'Ni el indicador de éxito ni el mensaje de error aparecieron tras el login en Bancolombia',
        );
      }
    } catch (err) {
      await this.captureFailureEvidence('bancolombia-login-failure');
      if (err instanceof InvalidCredentialsError || err instanceof PortalStructureChangedError) {
        throw err;
      }
      throw new PortalStructureChangedError(
        'Error inesperado durante el login en Bancolombia (posible cambio de portal)',
        err,
      );
    }
  }

  async sync(sincePointer?: string | null): Promise<RawMovement[]> {
    if (!this.page) {
      throw new Error('BancolombiaAdapter.sync() fue llamado sin haber iniciado sesión (ejecuta login() primero)');
    }
    const page = this.page;

    try {
      await page.goto(BANCOLOMBIA_MOVEMENTS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(SELECTORS.movementsList, { timeout: this.options.timeoutMs });

      // Formato NATIVO de Bancolombia, sin normalizar — eso es trabajo
      // de `bancolombia.parser.ts` (Movement Parser), no de este adapter.
      const rawRows = await page.$$eval(SELECTORS.movementRow, (rows: Element[]) =>
        rows.map((row) => ({
          fecha: row.querySelector('.TODO-date')?.textContent?.trim() ?? null,
          valor: row.querySelector('.TODO-amount')?.textContent?.trim() ?? null,
          descripcion: row.querySelector('.TODO-description')?.textContent?.trim() ?? null,
          numeroReferencia: row.querySelector('.TODO-reference')?.textContent?.trim() ?? null,
        })),
      );

      if (!sincePointer) {
        return rawRows;
      }

      // Igual que Nequi: más reciente primero, se corta justo antes del
      // último movimiento ya conocido.
      const cutoffIndex = rawRows.findIndex((row) => row.numeroReferencia === sincePointer);
      return cutoffIndex === -1 ? rawRows : rawRows.slice(0, cutoffIndex);
    } catch (err) {
      await this.captureFailureEvidence('bancolombia-sync-failure');
      throw new PortalStructureChangedError(
        'No se pudieron leer los movimientos en Bancolombia (posible cambio de portal)',
        err,
      );
    }
  }
}
