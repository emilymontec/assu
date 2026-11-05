import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // assu-ui vive fuera de esta app (paquete del workspace), así que Next
  // necesita transpilarlo explícitamente en vez de tratarlo como una
  // dependencia ya compilada de node_modules.
  transpilePackages: ['assu-ui'],
  // Salida autocontenida para la imagen Docker: .next/standalone trae el
  // server.js y solo los módulos que realmente se usan, sin necesitar un
  // `pnpm install` en la etapa de runtime.
  output: 'standalone',
  experimental: {
    // En un monorepo el rastreo de archivos debe arrancar desde la raíz del
    // workspace; si no, Next no incluye packages/assu-ui (vive fuera de esta
    // app) y el contenedor falla al arrancar. En Next 14 esta opción todavía
    // vive dentro de `experimental` (pasa a nivel raíz recién en Next 15).
    outputFileTracingRoot: path.join(__dirname, '..'),
  },
};

export default nextConfig;
