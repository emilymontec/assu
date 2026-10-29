'use client';

import { useEffect, useState } from 'react';
import { Blocks, Bot, Clock3, Gauge, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotImplementedYet } from '@/components/not-implemented-yet';
import { api } from '@/lib/api-client';
import type { SystemSettings } from '@/lib/types';

/**
 * Fila label/valor minimalista: hairline inferior, label en mayúsculas
 * tenues y valor alineado a la derecha — mismo lenguaje visual que
 * PageHeader/Card, sin introducir un nuevo patrón de tabla para datos
 * que no son una lista.
 */
function SettingRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-light py-3 last:border-b-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0 text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            {title}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="py-1">{children}</CardContent>
    </Card>
  );
}

function BoolBadge({ value, yes = 'Sí', no = 'No' }: { value: boolean; yes?: string; no?: string }) {
  return <Badge variant={value ? 'success' : 'default'}>{value ? yes : no}</Badge>;
}

/**
 * Cubre la parte de solo-lectura de Admin/Operations (módulo 23) que
 * faltaba: configuración operativa vigente de Assu. Es deliberadamente
 * de solo lectura — estos valores salen de variables de entorno
 * (`GET /settings`), así que cambiarlos es cosa de redeploy, no de un
 * formulario acá.
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((res) => setSettings(res as SystemSettings))
      .catch(() => setNotImplemented(true));
  }, []);

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Configuración operativa vigente de Assu — de solo lectura, definida por variables de entorno."
      />

      {notImplemented && <NotImplementedYet endpoint="GET /settings" module="Admin / Operations" />}

      {settings && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard icon={Blocks} title="Servicio" description="Identidad y entorno de este despliegue.">
            <SettingRow label="Nombre" value={settings.app.name} />
            <SettingRow label="Entorno" value={<Badge variant="accent">{settings.app.env}</Badge>} />
            <SettingRow label="Versión" value={<span className="font-mono text-xs">{settings.app.version}</span>} />
          </SectionCard>

          <SectionCard
            icon={ShieldCheck}
            title="Seguridad"
            description="Cifrado de credenciales bancarias en reposo."
          >
            <SettingRow
              label="Proveedor de cifrado"
              value={settings.security.encryptionProvider === 'aws-kms' ? 'AWS KMS' : 'Local (AES-256-GCM)'}
            />
            <SettingRow
              label="Rotación de clave en curso"
              value={<BoolBadge value={settings.security.keyRotationInProgress} />}
              hint="Si está activa, Assu todavía acepta la clave anterior para descifrar datos existentes."
            />
          </SectionCard>

          <SectionCard
            icon={Clock3}
            title="Sincronización y límites"
            description="Frecuencia por defecto y topes para no saturar a los bancos."
          >
            <SettingRow
              label="Intervalo de sync por defecto"
              value={`${settings.scheduler.defaultSyncIntervalSeconds}s`}
            />
            <SettingRow
              label="Máx. solicitudes por banco / min"
              value={settings.rateLimiting.maxRequestsPerBankPerMinute}
            />
            <SettingRow
              label="Mín. segundos entre syncs de una cuenta"
              value={settings.rateLimiting.minSecondsBetweenAccountSyncs}
            />
          </SectionCard>

          <SectionCard
            icon={Gauge}
            title="Monitoreo y alertas"
            description="Umbrales que disparan las alertas operativas."
          >
            <SettingRow
              label="Cuenta sin sincronizar (stale)"
              value={`${settings.monitoring.accountStaleThresholdMinutes} min`}
            />
            <SettingRow
              label="Umbral de tasa de error"
              value={`${Math.round(settings.monitoring.errorRateThreshold * 100)}%`}
              hint={`Ventana de ${settings.monitoring.errorRateWindowMinutes} min, mínimo ${settings.monitoring.errorRateMinSampleSize} muestras`}
            />
            <SettingRow label="Cooldown entre alertas repetidas" value={`${settings.monitoring.cooldownMinutes} min`} />
          </SectionCard>

          <SectionCard
            icon={Bot}
            title="Scraping"
            description="Aislamiento y comportamiento de los adapters de Playwright."
          >
            <SettingRow
              label="Modo de aislamiento"
              value={settings.scraping.isolationMode === 'docker' ? 'Docker (contenedor desechable)' : 'En proceso'}
            />
            {settings.scraping.dockerImage && (
              <SettingRow label="Imagen de Docker" value={<span className="font-mono text-xs">{settings.scraping.dockerImage}</span>} />
            )}
            <SettingRow label="Headless" value={<BoolBadge value={settings.scraping.headless} />} />
            <SettingRow label="Timeout" value={`${(settings.scraping.timeoutMs / 1000).toFixed(0)}s`} />
            <SettingRow
              label="Proxy dedicado configurado"
              value={<BoolBadge value={settings.scraping.proxyConfigured} />}
            />
          </SectionCard>

          <SectionCard icon={Blocks} title="Integraciones" description="Canales de ingesta y publicación de eventos.">
            <SettingRow label="Proveedor de OCR" value={settings.integrations.ocrProvider} />
            <SettingRow
              label="Bot de Telegram"
              value={<BoolBadge value={settings.integrations.telegramConfigured} yes="Configurado" no="Sin configurar" />}
            />
            <SettingRow
              label="Stream de eventos"
              value={<span className="font-mono text-xs">{settings.integrations.eventsStreamName}</span>}
            />
          </SectionCard>
        </div>
      )}
    </>
  );
}
