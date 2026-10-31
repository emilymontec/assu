import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const backline = localFont({
  src: './fonts/Backline.otf',
  variable: '--font-script',
  display: 'swap',
});

const foltyBold = localFont({
  src: './fonts/Folty-Bold.woff2',
  weight: '700',
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Assu — Portal de Comercios',
  description: 'Registra tu cuenta, conecta tus bancos y gestiona la seguridad de tu cuenta en Assu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${backline.variable} ${foltyBold.variable}`}>
      <body>{children}</body>
    </html>
  );
}
