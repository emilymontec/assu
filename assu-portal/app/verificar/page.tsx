'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { api, ApiError, setAccessToken } from '@/lib/api-client';

const POLL_INTERVAL_MS = 3000;

function VerificarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId') ?? '';
  const emailMasked = searchParams.get('email') ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED'>('PENDING');
  const resolvedRef = useRef(false);

  function finishWithSession(accessToken: string) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setAccessToken(accessToken);
    router.push('/portal');
  }

  // Sondea el estado de la aprobación desde un dispositivo de confianza
  // (el "sí" al estilo Google). En cuanto aparece APPROVED, completa el
  // intento para obtener la sesión — esta es la rama sin código de correo.
  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;

    async function poll() {
      try {
        const { status } = await api.attemptStatus(attemptId);
        if (cancelled || resolvedRef.current) return;
        setDeviceStatus(status);
        if (status === 'APPROVED') {
          const session = await api.completeAttempt(attemptId);
          finishWithSession(session.accessToken);
        }
      } catch {
        // Sin bloquear el flujo: si el sondeo falla una vez, se intenta de nuevo en el próximo ciclo.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.verifyCode(attemptId, code.trim());
      finishWithSession(session.accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Código incorrecto o expirado.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!attemptId) {
    return (
      <AuthShell title="Verificación no encontrada">
        <p className="text-[13px] text-muted-foreground">
          El enlace de verificación no es válido. Vuelve a intentar el inicio de sesión.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verifica que eres tú" subtitle="Detectamos un inicio de sesión desde un dispositivo nuevo">
      <div className="space-y-6">
        <div className="rounded-md border border-border-light bg-surface-2 p-4">
          <p className="text-[12px] font-medium text-foreground">Opción 1 · Aprueba desde un dispositivo de confianza</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Si ya iniciaste sesión antes en otro dispositivo, entra ahí y aprueba este inicio de sesión.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <StatusDot status={deviceStatus} />
            {statusLabel(deviceStatus)}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="h-px flex-1 bg-border-light" />
          o
          <div className="h-px flex-1 bg-border-light" />
        </div>

        <form onSubmit={handleSubmitCode} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Opción 2 · Código enviado a {emailMasked || 'tu correo'}</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-[0.3em]"
              required
            />
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" className="w-full" disabled={submitting || code.length < 6}>
            {submitting ? 'Verificando…' : 'Verificar código'}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

function StatusDot({ status }: { status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' }) {
  const color =
    status === 'APPROVED' ? 'bg-success' : status === 'DENIED' || status === 'EXPIRED' ? 'bg-danger' : 'bg-warning';
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}

function statusLabel(status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED'): string {
  switch (status) {
    case 'PENDING':
      return 'Esperando aprobación…';
    case 'APPROVED':
      return 'Aprobado, entrando…';
    case 'DENIED':
      return 'La aprobación fue rechazada desde el otro dispositivo.';
    case 'EXPIRED':
      return 'La solicitud expiró. Usa el código por correo.';
  }
}

export default function VerificarPage() {
  return (
    <Suspense>
      <VerificarForm />
    </Suspense>
  );
}
