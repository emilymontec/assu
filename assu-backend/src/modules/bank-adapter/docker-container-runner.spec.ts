import { EventEmitter } from 'events';
import { InvalidCredentialsError, PortalStructureChangedError } from '../../common/errors/permanent.error';
import { BankUnavailableError, TimeoutError } from '../../common/errors/transient.error';

class FakeChildProcess extends EventEmitter {
  stdin = { write: jest.fn(), end: jest.fn() };
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = jest.fn();
}

let fakeChild: FakeChildProcess;
const spawnMock = jest.fn((..._args: unknown[]) => fakeChild);

jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

// eslint-disable-next-line import/first
import { runScraperContainer } from './docker-container-runner';

describe('runScraperContainer', () => {
  beforeEach(() => {
    fakeChild = new FakeChildProcess();
    spawnMock.mockClear();
    spawnMock.mockImplementation(() => fakeChild);
  });

  const config = { image: 'assu-backend-scraper:latest', timeoutMs: 5000 };
  const job = { action: 'sync' as const, adapterKey: 'nequi', sincePointer: null };

  function emitStdoutAndClose(payload: unknown) {
    fakeChild.stdout.emit('data', Buffer.from(JSON.stringify(payload)));
    fakeChild.emit('close', 0);
  }

  it('invoca "docker run --rm -i <image>" y manda el job por stdin (no por argv)', async () => {
    const promise = runScraperContainer(config, job);
    emitStdoutAndClose({ ok: true, movements: [] });
    await promise;

    expect(spawnMock).toHaveBeenCalledWith('docker', ['run', '--rm', '-i', 'assu-backend-scraper:latest'], expect.anything());
    expect(fakeChild.stdin.write).toHaveBeenCalledWith(JSON.stringify(job));
    expect(fakeChild.stdin.end).toHaveBeenCalled();
  });

  it('agrega --network cuando se configura', async () => {
    const promise = runScraperContainer({ ...config, network: 'assu-scraper-net' }, job);
    emitStdoutAndClose({ ok: true, movements: [] });
    await promise;

    expect(spawnMock).toHaveBeenCalledWith(
      'docker',
      ['run', '--rm', '-i', '--network', 'assu-scraper-net', 'assu-backend-scraper:latest'],
      expect.anything(),
    );
  });

  it('resuelve con el resultado cuando el contenedor termina con éxito', async () => {
    const promise = runScraperContainer(config, job);
    emitStdoutAndClose({ ok: true, movements: [{ referencia: 'ref-1' }] });

    await expect(promise).resolves.toEqual({ ok: true, movements: [{ referencia: 'ref-1' }] });
  });

  it('traduce error.type="InvalidCredentialsError" a la clase real', async () => {
    const promise = runScraperContainer(config, job);
    emitStdoutAndClose({ ok: false, error: { type: 'InvalidCredentialsError', message: 'clave mala' } });

    await expect(promise).rejects.toThrow(InvalidCredentialsError);
    await expect(promise).rejects.toThrow('clave mala');
  });

  it('usa BankUnavailableError como fallback para un error.type desconocido', async () => {
    const promise = runScraperContainer(config, job);
    emitStdoutAndClose({ ok: false, error: { type: 'AlgoQueNuncaHemosVisto', message: 'raro' } });

    await expect(promise).rejects.toThrow(BankUnavailableError);
  });

  it('lanza PortalStructureChangedError si stdout no es JSON válido', async () => {
    const promise = runScraperContainer(config, job);
    fakeChild.stdout.emit('data', Buffer.from('esto no es json'));
    fakeChild.emit('close', 1);

    await expect(promise).rejects.toThrow(PortalStructureChangedError);
  });

  it('lanza BankUnavailableError si Docker no se puede ni siquiera arrancar', async () => {
    const promise = runScraperContainer(config, job);
    fakeChild.emit('error', new Error('spawn docker ENOENT'));

    await expect(promise).rejects.toThrow(BankUnavailableError);
  });

  it('mata el proceso y lanza TimeoutError si se excede el tiempo configurado', async () => {
    jest.useFakeTimers();
    const promise = runScraperContainer({ ...config, timeoutMs: 1000 }, job);

    jest.advanceTimersByTime(1001);
    await expect(promise).rejects.toThrow(TimeoutError);
    expect(fakeChild.kill).toHaveBeenCalledWith('SIGKILL');

    jest.useRealTimers();
  });
});
