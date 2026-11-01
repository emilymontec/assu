import type { Config } from 'tailwindcss';
import preset from 'assu-ui/tailwind-preset';

const config: Config = {
  presets: [preset],
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
