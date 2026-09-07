import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

// Manrope: sans geométrica y redondeada, para toda la interfaz (tablas
// densas, botones, labels). Folty solo llegó en su corte Bold — no
// alcanza para texto de cuerpo a tamaños chicos, así que Manrope sigue
// siendo la workhorse font del panel.
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Backline: el script real del logotipo "Assu" (brand board). Se usa
// EXCLUSIVAMENTE en components/logo.tsx — nunca en texto de interfaz.
const backline = localFont({
  src: './fonts/Backline.otf',
  variable: '--font-script',
  display: 'swap',
});

// Folty Bold: la sans de marca, en el único corte que llegó (Bold). Se
// usa como "display" — títulos de página y momentos puntuales donde
// vale la pena mostrar personalidad de marca — nunca en tablas ni texto
// pequeño, donde un peso único y grueso perjudica la legibilidad.
const foltyBold = localFont({
  src: './fonts/Folty-Bold.woff2',
  weight: '700',
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Assu — Verificación de Movimientos',
  description: 'Panel de operaciones de Assu: bancos, cuentas, movimientos y sincronización.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${backline.variable} ${foltyBold.variable}`}>
      <body>{children}</body>
    </html>
  );
}
