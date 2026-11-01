import type { Metadata } from 'next';
import { fontVariables } from 'assu-ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Assu — Verificación de Movimientos',
  description: 'Panel de operaciones de Assu: bancos, cuentas, movimientos y sincronización.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
