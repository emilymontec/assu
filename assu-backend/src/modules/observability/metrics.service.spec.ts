import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  function buildService(): MetricsService {
    return new MetricsService();
  }

  it('expone las métricas en formato de exposición de Prometheus', async () => {
    const service = buildService();

    const output = await service.getMetrics();

    expect(output).toContain('# HELP collector_syncs_total');
    expect(output).toContain('# TYPE collector_syncs_total counter');
  });

  it('getContentType() devuelve el content-type que espera Prometheus', () => {
    const service = buildService();
    expect(service.getContentType()).toContain('text/plain');
  });

  describe('recordSync()', () => {
    it('incrementa el contador y registra la duración con las labels correctas', async () => {
      const service = buildService();

      service.recordSync('nequi', 'SUCCESS', 2500);

      const output = await service.getMetrics();
      expect(output).toMatch(/collector_syncs_total\{.*bank="nequi".*status="SUCCESS".*\} 1/);
      // El histograma se expresa en segundos, no en milisegundos.
      expect(output).toContain('collector_sync_duration_seconds_sum{bank="nequi",status="SUCCESS"} 2.5');
    });
  });

  describe('recordMovementsSaved()', () => {
    it('suma la cantidad de movimientos al contador del banco', async () => {
      const service = buildService();

      service.recordMovementsSaved('nequi', 3);

      const output = await service.getMetrics();
      expect(output).toMatch(/collector_movements_saved_total\{bank="nequi"\} 3/);
    });

    it('no incrementa el contador si count es 0 (evita series de tiempo vacías innecesarias)', async () => {
      const service = buildService();

      service.recordMovementsSaved('nequi', 0);

      const output = await service.getMetrics();
      expect(output).not.toContain('collector_movements_saved_total{bank="nequi"}');
    });
  });

  describe('recordSyncError()', () => {
    it('incrementa el contador de errores por banco y tipo', async () => {
      const service = buildService();

      service.recordSyncError('nequi', 'TransientError');

      const output = await service.getMetrics();
      expect(output).toMatch(/collector_sync_errors_total\{.*bank="nequi".*errorType="TransientError".*\} 1/);
    });
  });

  describe('recordRetry()', () => {
    it('incrementa el contador global de reintentos', async () => {
      const service = buildService();

      service.recordRetry();
      service.recordRetry();

      const output = await service.getMetrics();
      expect(output).toContain('collector_retries_total 2');
    });
  });

  describe('recordSessionExpired()', () => {
    it('incrementa el contador global de sesiones expiradas', async () => {
      const service = buildService();

      service.recordSessionExpired();
      service.recordSessionExpired();

      const output = await service.getMetrics();
      expect(output).toContain('collector_expired_sessions_total 2');
    });
  });
});
