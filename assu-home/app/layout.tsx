import type { Metadata } from 'next';
import { fontVariables } from 'assu-ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Assu — Verificación automática de movimientos bancarios',
  description:
    'Assu confirma cada transferencia que recibe tu comercio en segundos, sin revisar extractos a mano, y te avisa de cualquier acceso o cambio en tu cuenta.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
