'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Landmark,
  Wallet,
  ArrowLeftRight,
  History,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

const NAV_ITEMS = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/banks', label: 'Bancos', icon: Landmark },
  { href: '/accounts', label: 'Cuentas', icon: Wallet },
  { href: '/movements', label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/sync-logs', label: 'Historial de sync', icon: History },
  { href: '/monitoring', label: 'Monitoreo', icon: ShieldAlert },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col bg-ink text-white">
      <div className="border-b border-ink-border px-4 py-4">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-white/55 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-border p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-white/55 hover:bg-white/5 hover:text-white"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
