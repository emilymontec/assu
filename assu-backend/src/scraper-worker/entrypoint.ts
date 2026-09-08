#!/usr/bin/env node
import { ADAPTER_MAP } from './adapter-map';
import { ScraperJob, ScraperResult } from './scraper-job.types';

/**
 * Punto de entrada del contenedor de scraping desechable
 * (`docker/scraper/Dockerfile`). No importa NestJS, Prisma, ni ningún
 * módulo que hable con Postgres/Redis — su única razón de existir es
 * correr Playwright de forma aislada y devolver un resultado.
 *
 * Protocolo: lee un `ScraperJob` (JSON) por stdin, hace login/sync/logout
 * según `action`, imprime un `ScraperResult` (JSON) por stdout, y sale
 * con código 0 (éxito) o 1 (error — el error también va en el JSON de
 * stdout, no solo en el exit code, para no perder el detalle).
 *
 * NUNCA loguea las credenciales ni el contenido de la sesión — solo el
 * `adapterKey` y la acción, a stderr, para poder debuggear sin tener
 * secretos en los logs del contenedor.
 */

const TIMEOUT_MS = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);
const HEADLESS = (process.env.SCRAPER_HEADLESS ?? 'true').toLowerCase() === 'true';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const job = JSON.parse(raw) as ScraperJob;

  process.stderr.write(`[scraper-worker] adapterKey=${job.adapterKey} action=${job.action}\n`);

  const AdapterCtor = ADAPTER_MAP[job.adapterKey];
  if (!AdapterCtor) {
    return emitError('UnknownAdapterError', `No hay adapter registrado para "${job.adapterKey}"`);
  }

  const adapter = new AdapterCtor({
    headless: HEADLESS,
    timeoutMs: TIMEOUT_MS,
    proxy: process.env.SCRAPER_PROXY_SERVER
      ? {
          server: process.env.SCRAPER_PROXY_SERVER,
          username: process.env.SCRAPER_PROXY_USERNAME,
          password: process.env.SCRAPER_PROXY_PASSWORD,
        }
      : undefined,
  });

  try {
    if (job.session && adapter.restoreSession && job.action !== 'login') {
      await adapter.restoreSession(job.session);
    }

    switch (job.action) {
      case 'login': {
        if (!job.credentials) throw new Error('action=login requiere "credentials" en el job');
        await adapter.login(job.credentials);
        const session = adapter.exportSession ? await adapter.exportSession() : { cookies: [], tokens: {} };
        emitSuccess({ session });
        return;
      }
      case 'sync': {
        const movements = await adapter.sync(job.sincePointer ?? null);
        emitSuccess({ movements });
        return;
      }
      case 'logout': {
        await adapter.logout();
        emitSuccess({});
        return;
      }
      default:
        return emitError('UnknownActionError', `Acción desconocida: ${String(job.action)}`);
    }
  } catch (err) {
    emitError(err instanceof Error ? err.constructor.name : 'UnknownError', err instanceof Error ? err.message : String(err));
  }
}

function emitSuccess(partial: { session?: unknown; movements?: unknown }): void {
  const result: ScraperResult = { ok: true, ...partial } as ScraperResult;
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}

function emitError(type: string, message: string): void {
  const result: ScraperResult = { ok: false, error: { type, message } };
  process.stdout.write(JSON.stringify(result));
  process.exit(1);
}

main().catch((err) => {
  emitError('FatalWorkerError', err instanceof Error ? err.message : String(err));
});
