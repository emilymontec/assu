import { NextRequest, NextResponse } from 'next/server';

/**
 * Todo lo que el navegador pide a /api/backend/* pasa por aquí antes de
 * llegar al backend real de Assu (repo `assu-backend/`). Este es el
 * ÚNICO lugar donde vive
 * ASSU_BACKEND_API_KEY — nunca se manda al cliente.
 */

const ASSU_BACKEND_API_URL = process.env.ASSU_BACKEND_API_URL ?? 'http://localhost:3000';
const ASSU_BACKEND_API_KEY = process.env.ASSU_BACKEND_API_KEY ?? '';

async function proxy(req: NextRequest, path: string[]) {
  const targetUrl = new URL(`/${path.join('/')}`, ASSU_BACKEND_API_URL);
  targetUrl.search = req.nextUrl.search;

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ASSU_BACKEND_API_KEY,
    },
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

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
