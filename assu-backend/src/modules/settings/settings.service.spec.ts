import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  function buildService(values: Record<string, unknown>) {
    const configService = { get: jest.fn((key: string) => values[key]) };
    const service = new SettingsService(configService as any);
    return { service, configService };
  }

  const BASE_VALUES: Record<string, unknown> = {
    'app.name': 'assu',
    'app.env': 'production',
    'security.encryptionProvider': 'local',
    'security.credentialsEncryptionKeyPrevious': undefined,
    'scheduler.defaultSyncIntervalSeconds': 60,
    'rateLimiting.maxRequestsPerBankPerMinute': 20,
    'rateLimiting.minSecondsBetweenAccountSyncs': 10,
    'scraperIsolation.mode': 'in-process',
    'scraperIsolation.dockerImage': 'assu-backend-scraper:latest',
    'playwright.headless': true,
    'playwright.timeoutMs': 30000,
    'playwright.proxy': undefined,
    'monitoring.accountStaleThresholdMinutes': 30,
    'monitoring.errorRateWindowMinutes': 15,
    'monitoring.errorRateThreshold': 0.5,
    'monitoring.errorRateMinSampleSize': 3,
    'monitoring.cooldownMinutes': 60,
    'ocr.provider': 'tesseract',
    'telegram.botToken': 'some-token',
    'events.streamName': 'assu.movements',
  };

  it('nunca expone secretos: solo booleanos de presencia para claves/tokens/proxy', () => {
    const { service } = buildService(BASE_VALUES);

    const result = service.getSettings();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('some-token');
    expect(result.security.keyRotationInProgress).toBe(false);
    expect(result.integrations.telegramConfigured).toBe(true);
    expect(result.scraping.proxyConfigured).toBe(false);
  });

  it('reporta keyRotationInProgress=true solo cuando hay clave previa configurada', () => {
    const { service } = buildService({
      ...BASE_VALUES,
      'security.credentialsEncryptionKeyPrevious': 'a'.repeat(64),
    });

    expect(service.getSettings().security.keyRotationInProgress).toBe(true);
  });

  it('solo expone dockerImage cuando el modo de aislamiento es "docker"', () => {
    const { service: inProcess } = buildService(BASE_VALUES);
    expect(inProcess.getSettings().scraping.dockerImage).toBeNull();

    const { service: dockerized } = buildService({ ...BASE_VALUES, 'scraperIsolation.mode': 'docker' });
    expect(dockerized.getSettings().scraping.dockerImage).toBe('assu-backend-scraper:latest');
  });

  it('reporta proxyConfigured=true cuando playwright.proxy está presente', () => {
    const { service } = buildService({
      ...BASE_VALUES,
      'playwright.proxy': { server: 'http://proxy.example.com' },
    });

    expect(service.getSettings().scraping.proxyConfigured).toBe(true);
  });

  it('incluye un timestamp ISO en cada llamada', () => {
    const { service } = buildService(BASE_VALUES);
    const result = service.getSettings();

    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
