import Link from 'next/link';
import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroGraphic } from '@/components/hero-graphic';
import { cn } from '@/lib/utils';

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3300';

const BANKS = ['Nequi', 'Bancolombia', 'Davivienda'];

const STEPS = [
  {
    n: '01',
    title: 'Conecta tu cuenta',
    body: 'Autorizas el acceso de solo lectura a tu banco una sola vez, desde tu portal de comercio.',
  },
  {
    n: '02',
    title: 'Verificamos cada movimiento',
    body: 'Comparamos referencia, monto y fecha contra lo ya registrado, para descartar duplicados y datos incompletos.',
  },
  {
    n: '03',
    title: 'Te notificamos',
    body: 'Por correo y en tu portal, apenas se confirma un movimiento o cambia algo en tu cuenta.',
  },
  {
    n: '04',
    title: 'Tu equipo decide',
    body: 'Con el movimiento ya verificado, confirman el pedido o el pago sin perder tiempo revisando extractos.',
  },
];

const FEATURES = [
  {
    title: 'Se adapta a tu banco',
    body: 'Sumamos bancos nuevos sin interrumpir el servicio de los que ya usas — cada uno se conecta por su propio adaptador.',
  },
  {
    title: 'Nunca ves un movimiento repetido',
    body: 'Cada transferencia se compara por referencia, monto y fecha antes de guardarse, así que lo duplicado nunca llega a tu lista.',
  },
  {
    title: 'Nada se pierde en el camino',
    body: 'Si un banco falla o se cae la conexión, reintentamos automáticamente hasta confirmar el movimiento.',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background">
      <Nav />
      <Hero />
      <BankStrip />
      <HowItWorks />
      <Security />
      <Features />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border-light bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo compact surface="light" />
        <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground">
            Cómo funciona
          </a>
          <a href="#seguridad" className="hover:text-foreground">
            Seguridad
          </a>
          <a href="#bancos" className="hover:text-foreground">
            Bancos
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href={`${PORTAL_URL}/login`} className="px-2 text-[13px] font-medium text-foreground hover:text-accent">
            Iniciar sesión
          </Link>
          <Link href={`${PORTAL_URL}/registro`} className={cn(buttonVariants({ size: 'sm' }))}>
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <Badge variant="accent">Verificación automática de movimientos</Badge>
          <h1 className="mt-5 font-display text-[40px] leading-[1.05] text-foreground md:text-[56px]">
            Deja de revisar extractos a mano.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Assu confirma cada transferencia que recibe tu comercio en segundos y te avisa apenas algo cambia en tu
            cuenta — sin hojas de cálculo ni capturas de pantalla.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={`${PORTAL_URL}/registro`} className={cn(buttonVariants({ size: 'default' }))}>
              Crear cuenta
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex h-9 items-center px-1 text-[13px] font-medium text-foreground hover:text-accent"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>
        <HeroGraphic />
      </div>
    </section>
  );
}

function BankStrip() {
  return (
    <section id="bancos" className="border-y border-border-light bg-surface-2 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 md:flex-row md:items-center md:justify-between">
        <p className="text-[13px] text-muted-foreground">Compatible con los bancos que tu comercio ya usa</p>
        <div className="flex flex-wrap gap-2.5">
          {BANKS.map((bank) => (
            <span key={bank} className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground">
              {bank}
            </span>
          ))}
          <span className="rounded-md border border-dashed border-border px-3 py-1.5 text-[13px] text-muted-foreground">
            más bancos, sin cambiar tu integración
          </span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="font-display text-[28px] text-foreground md:text-[32px]">Cómo funciona</h2>
      <ol className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2">
        {STEPS.map((step) => (
          <li key={step.n} className="flex gap-4 border-l-2 border-accent/30 pl-5">
            <span className="font-display text-xl text-accent">{step.n}</span>
            <div>
              <p className="text-[15px] font-semibold text-foreground">{step.title}</p>
              <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Security() {
  return (
    <section id="seguridad" className="bg-ink py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="font-display text-[28px] text-white md:text-[32px]">Pensado para proteger cada cuenta</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <SecurityCard
            title="Seguridad desde el primer acceso"
            body="El registro pide documento de identidad y una foto de la cédula, que guardamos cifrada — nunca a la vista, ni siquiera para nuestro propio equipo."
          />
          <SecurityCard
            title="Dos formas de confirmar que eres tú"
            body="Un inicio de sesión desde un dispositivo nuevo pide un código enviado a tu correo o la aprobación de un dispositivo en el que ya confías — igual que el 'sí' de Google."
          />
        </div>
      </div>
    </section>
  );
}

function SecurityCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-bento border border-ink-border bg-ink-light p-6">
      <p className="text-[15px] font-semibold text-white">{title}</p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="font-display text-[28px] text-foreground md:text-[32px]">Construido para no fallarte</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-bento border border-border bg-card p-6">
            <p className="text-[14px] font-semibold text-foreground">{feature.title}</p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-ink py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center">
        <h2 className="max-w-md font-display text-[28px] leading-tight text-white md:text-[32px]">
          Empieza a verificar tus movimientos hoy.
        </h2>
        <Link href={`${PORTAL_URL}/registro`} className={cn(buttonVariants({ size: 'default' }))}>
          Crear cuenta
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border-light">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 md:flex-row md:items-center">
        <Logo compact surface="light" />
        <div className="flex items-center gap-6 text-[13px] text-muted-foreground">
          <Link href={`${PORTAL_URL}/login`} className="hover:text-foreground">
            Iniciar sesión
          </Link>
          <Link href={`${PORTAL_URL}/registro`} className="hover:text-foreground">
            Crear cuenta
          </Link>
          <span>© 2026 Assu</span>
        </div>
      </div>
    </footer>
  );
}
