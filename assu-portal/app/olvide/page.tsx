'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldHint, FieldError } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.password.forgot(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el correo. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace para elegir una nueva">
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-md border border-accent/25 bg-accent/5 px-3 py-2 text-[12px] text-accent">
            Si existe una cuenta con ese correo, enviamos un enlace de recuperación. Revisa tu bandeja (y el spam).
          </div>
          <Link href="/login" className="block text-center text-[12px] font-medium text-accent hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <FieldHint>Usa el correo con el que te registraste.</FieldHint>
          </div>

          {error && <FieldError>{error}</FieldError>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar enlace'}
          </Button>

          <p className="text-center text-[12px] text-muted-foreground">
            <Link href="/login" className="font-medium text-accent hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
