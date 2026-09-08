import { spawn } from 'child_process';
import { InvalidCredentialsError, PortalStructureChangedError } from '../../common/errors/permanent.error';
import { BankUnavailableError, TimeoutError } from '../../common/errors/transient.error';
import { ScraperJob, ScraperResult } from '../../scraper-worker/scraper-job.types';

export interface DockerScraperConfig {
  image: string;
  timeoutMs: number;
  /** Red de Docker a usar (ej. una red interna con el proxy residencial). `undefined` deja el default de Docker. */
  network?: string;
}

/**
 * Clases reales a las que se traduce cada `error.type` que devuelve el
 * contenedor — así el resto del sistema (Login Manager, Retry & Error
 * Handling) sigue viendo los mismos tipos de error que en modo
 * in-process, sin enterarse de que la ejecución fue en un contenedor.
 */
const ERROR_TYPE_MAP: Record<string, new (message: string) => Error> = {
  InvalidCredentialsError,
  PortalStructureChangedError,
  BankUnavailableError,
  TimeoutError,
};

/**
 * Corre `docker run --rm -i <image>` con el job por stdin y espera el
 * resultado por stdout. El contenedor se destruye (`--rm`) apenas
 * termina, exitosa o fallidamente — nunca queda un contenedor huérfano
 * con datos de la sesión/credenciales adentro.
 *
 * Las credenciales viajan SOLO por stdin, nunca como argumento de
 * `docker run` ni como variable de entorno del contenedor (ambos
 * quedan visibles vía `ps aux` / `docker inspect` mientras el proceso
 * vive; stdin no).
 */
export function runScraperContainer(config: DockerScraperConfig, job: ScraperJob): Promise<ScraperResult> {
  return new Promise<ScraperResult>((resolve, reject) => {
    const args = ['run', '--rm', '-i', ...(config.network ? ['--network', config.network] : []), config.image];
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new TimeoutError(`El contenedor de scraping (${job.adapterKey}/${job.action}) superó ${config.timeoutMs}ms`));
    }, config.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new BankUnavailableError('No se pudo iniciar el contenedor de scraping (¿Docker no está disponible en este host?)', err),
      );
    });

    child.on('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(JSON.parse(stdout) as ScraperResult);
      } catch {
        reject(
          new PortalStructureChangedError(
            `El contenedor de scraping devolvió una salida no interpretable. stderr: ${stderr.slice(0, 500)}`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(job));
    child.stdin.end();
  }).then((result) => {
    if (!result.ok) {
      const ErrorCtor = ERROR_TYPE_MAP[result.error.type] ?? BankUnavailableError;
      throw new ErrorCtor(result.error.message);
    }
    return result;
  });
}
