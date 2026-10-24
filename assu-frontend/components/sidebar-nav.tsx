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

// Riel lateral oscuro: el único lugar donde el panel usa la superficie
// "bento negra" de la plantilla — ítems en pill (radio completo) y
// estado activo con relleno sólido en el teal de marca (en vez del tinte
// sutil de antes), igual que .nav-item.active en layout.css.
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-ink text-white">
      <div className="border-b border-ink-border px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent text-white shadow-accent'
                  : 'text-white/55 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon
                className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
                strokeWidth={1.75}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-border p-3">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-white/55 transition-all duration-150 hover:bg-white/8 hover:text-white"
        >
          <Settings
            className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
            strokeWidth={1.75}
          />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
