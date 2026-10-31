'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { api, ApiError, isSession, setAccessToken } from '@/lib/api-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registrado') === '1';

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.login(email.trim(), password);
      if (isSession(result)) {
        // El dispositivo ya es de confianza: entra directo, sin segundo factor.
        setAccessToken(result.accessToken);
        router.push('/portal');
      } else {
        // Dispositivo nuevo: queda pendiente el código por correo o la
        // aprobación desde un dispositivo de confianza — ambos corren en
        // paralelo sobre el mismo attemptId.
        router.push(`/verificar?attemptId=${encodeURIComponent(result.attemptId)}&email=${encodeURIComponent(result.emailMasked)}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Inicia sesión" subtitle="Accede a tu cuenta de comercio en Assu">
      <form onSubmit={handleSubmit} className="space-y-4">
        {justRegistered && (
          <div className="rounded-md border border-accent/25 bg-accent/5 px-3 py-2 text-[12px] text-accent">
            Tu cuenta fue creada. Ya puedes iniciar sesión.
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <FieldError>{error}</FieldError>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>

        <p className="text-center text-[12px] text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="font-medium text-accent hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
