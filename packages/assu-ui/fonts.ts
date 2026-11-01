import { Manrope } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * Carga de fuentes centralizada — antes cada una de las 3 apps Next.js
 * repetía exactamente esta misma configuración. Las rutas de `localFont`
 * son relativas a este archivo, así que siguen resolviendo aunque el
 * paquete se consuma desde fuera vía `transpilePackages`.
 */
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

/** Para `<html className={fontVariables}>` en el layout raíz de cada app. */
export const fontVariables = `${manrope.variable} ${backline.variable} ${foltyBold.variable}`;
