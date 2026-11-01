/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // assu-ui vive fuera de esta app (paquete del workspace), así que Next
  // necesita transpilarlo explícitamente en vez de tratarlo como una
  // dependencia ya compilada de node_modules.
  transpilePackages: ['assu-ui'],
};

export default nextConfig;
