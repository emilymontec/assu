'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { clearAccessToken, getAccessToken } from '@/lib/api-client';

const NAV = [
  { href: '/portal', label: 'Resumen' },
  { href: '/portal/verificaciones', label: 'Verificaciones' },
  { href: '/portal/seguridad', label: 'Seguridad' },
] as const;

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // null = todavía no se verificó (evita parpadeo de redirect en el primer render).
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      setAuthorized(false);
    } else {
      setAuthorized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    clearAccessToken();
    router.push('/login');
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Logo compact surface="light" />
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => {
                const active = item.href === '/portal' ? pathname === '/portal' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border-light px-4 py-2 sm:hidden">
          {NAV.map((item) => {
            const active = item.href === '/portal' ? pathname === '/portal' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
