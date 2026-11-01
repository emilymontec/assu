import type { Config } from 'tailwindcss';
import preset from 'assu-ui/tailwind-preset';

const config: Config = {
  presets: [preset],
  // Incluye el propio código de la app y el del paquete de diseño
  // compartido (assu-ui) — si no se escanea este último, Tailwind purga
  // en build las clases que solo usan sus componentes.
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // Rutas explícitas (no un "**" recursivo) para no bajar por
    // ../packages/assu-ui/node_modules — Tailwind avisa de eso.
    '../packages/assu-ui/*.{ts,tsx}',
    '../packages/assu-ui/ui/*.{ts,tsx}',
  ],
};

export default config;
