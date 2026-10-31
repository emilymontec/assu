'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { clearAccessToken, getAccessToken } from '@/lib/api-client';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
          <Logo compact surface="light" />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
