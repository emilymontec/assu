'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldHint, FieldError } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api-client';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}$/;

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!PASSWORD_PATTERN.test(password)) {
      setError('La contraseña debe tener mínimo 10 caracteres, con mayúscula, minúscula y número.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.password.reset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <FieldError>El enlace no es válido: falta el token de recuperación.</FieldError>
        <Link href="/olvide" className="block text-center text-[12px] font-medium text-accent hover:underline">
          Solicitar un enlace nuevo
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-accent/25 bg-accent/5 px-3 py-2 text-[12px] text-accent">
          Tu contraseña fue actualizada. Ya puedes iniciar sesión.
        </div>
        <Link href="/login" className="block text-center text-[12px] font-medium text-accent hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <FieldHint>Mínimo 10 caracteres, con mayúscula, minúscula y número.</FieldHint>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Repite la contraseña</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>

      {error && <FieldError>{error}</FieldError>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Nueva contraseña" subtitle="Elige una contraseña segura para tu cuenta">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
