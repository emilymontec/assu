import { NextRequest, NextResponse } from 'next/server';

/**
 * A diferencia del proxy de assu-frontend (que inyecta una API key
 * compartida server-side porque el panel admin no tiene usuarios), acá
 * NO hay secreto que ocultar: cada comercio se autentica con su propio
 * JWT (`Authorization: Bearer ...`), que el navegador ya trae y este
 * proxy simplemente reenvía intacto, junto con `x-device-id`/
 * `x-device-label` (el fingerprint de dispositivo que exige
 * AuthController). Este proxy existe solo para resolver la URL del
 * backend desde el servidor (variable de entorno, no hardcodeada en el
 * bundle del navegador) y evitar CORS.
 */
const ASSU_BACKEND_API_URL = process.env.ASSU_BACKEND_API_URL ?? 'http://localhost:3000';

const FORWARDED_HEADERS = ['authorization', 'x-device-id', 'x-device-label', 'content-type'];

async function proxy(req: NextRequest, path: string[]) {
  const targetUrl = new URL(`/${path.join('/')}`, ASSU_BACKEND_API_URL);
  targetUrl.search = req.nextUrl.search;

  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  const isMultipart = headers['content-type']?.startsWith('multipart/form-data');
  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : isMultipart
        ? await req.arrayBuffer()
        : await req.text();

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    cache: 'no-store',
  });

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
