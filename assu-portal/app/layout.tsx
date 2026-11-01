import type { Metadata } from 'next';
import { fontVariables } from 'assu-ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Assu — Portal de Comercios',
  description: 'Registra tu cuenta, conecta tus bancos y gestiona la seguridad de tu cuenta en Assu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
