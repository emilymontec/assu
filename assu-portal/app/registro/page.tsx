'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError, Select } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api-client';

type DocumentType = 'CC' | 'CE' | 'NIT' | 'PASAPORTE';

interface FormState {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_STATE: FormState = {
  fullName: '',
  documentType: 'CC',
  documentNumber: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const TOTAL_STEPS = 3;

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [documentPhoto, setDocumentPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1(): string | null {
    if (!form.fullName.trim()) return 'Escribe tu nombre completo.';
    if (!form.documentNumber.trim()) return 'Escribe tu número de documento.';
    if (!form.email.trim()) return 'Escribe tu correo electrónico.';
    if (!form.phone.trim()) return 'Escribe tu número de teléfono.';
    return null;
  }

  function validateStep2(): string | null {
    // Debe calzar con RegisterMerchantDto.password en el backend (mínimo
    // 10 caracteres, con mayúscula, minúscula y número) para que la
    // validación del lado del cliente nunca sea más laxa que la del servidor.
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}$/.test(form.password)) {
      return 'La contraseña debe tener mínimo 10 caracteres, con mayúscula, minúscula y número.';
    }
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  function goNext() {
    const validationError = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentPhoto) {
      setError('Sube una foto de tu documento de identidad para continuar.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName.trim());
      formData.append('documentType', form.documentType);
      formData.append('documentNumber', form.documentNumber.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('password', form.password);
      formData.append('documentPhoto', documentPhoto);

      await api.register(formData);
      router.push(`/login?registrado=1&email=${encodeURIComponent(form.email.trim())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta de comercio"
      subtitle={`Paso ${step} de ${TOTAL_STEPS} — ${stepLabel(step)}`}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Nombre completo">
              <Input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Como aparece en tu documento" required />
            </Field>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <Field label="Tipo">
                <Select value={form.documentType} onChange={(e) => update('documentType', e.target.value as DocumentType)}>
                  <option value="CC">C.C.</option>
                  <option value="CE">C.E.</option>
                  <option value="NIT">NIT</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </Select>
              </Field>
              <Field label="Número de documento">
                <Input value={form.documentNumber} onChange={(e) => update('documentNumber', e.target.value)} placeholder="1234567890" required />
              </Field>
            </div>
            <Field label="Correo electrónico">
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="tucorreo@ejemplo.com" required />
            </Field>
            <Field label="Teléfono">
              <Input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="3001234567" required />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Contraseña" hint="Mínimo 10 caracteres, con mayúscula, minúscula y número.">
              <Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
            </Field>
            <Field label="Confirmar contraseña">
              <Input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="Foto de tu documento de identidad" hint="La usamos para verificar tu identidad. Se guarda cifrada y nunca se comparte.">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setDocumentPhoto(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-md border border-dashed border-border bg-surface-2 px-3 py-6 text-center text-[13px] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-accent-foreground"
                required
              />
            </Field>
            {documentPhoto && <p className="text-[12px] text-muted-foreground">Seleccionado: {documentPhoto.name}</p>}
          </div>
        )}

        {error && <FieldError>{error}</FieldError>}

        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
              Atrás
            </Button>
          ) : (
            <Link href="/login" className="text-[12px] text-muted-foreground hover:text-foreground">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          )}

          {step < TOTAL_STEPS ? (
            <Button type="button" onClick={goNext}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}

function stepLabel(step: number): string {
  if (step === 1) return 'Datos personales';
  if (step === 2) return 'Contraseña';
  return 'Verificación de identidad';
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
