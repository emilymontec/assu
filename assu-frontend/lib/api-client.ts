/**
 * Este cliente SIEMPRE llama a rutas relativas de este mismo Next.js app
 * (/api/backend/...), nunca directamente a la Internal API del backend de Assu.
 * El proxy en app/api/backend/[...path]/route.ts es quien agrega el
 * `x-api-key` server-side — así el navegador nunca ve esa credencial.
 */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request('/health'),
  status: {
    get: () => request('/status'),
  },
  banks: {
    list: () => request('/banks'),
  },
  accounts: {
    list: () => request('/bank-accounts'),
    needingReconnection: () => request('/bank-accounts/needing-reconnection'),
    forceSync: (accountId: string) =>
      request(`/sync`, { method: 'POST', body: JSON.stringify({ accountId }) }),
    suspend: (accountId: string) => request(`/bank-accounts/${accountId}/suspend`, { method: 'PATCH' }),
    reactivate: (accountId: string) => request(`/bank-accounts/${accountId}/reactivate`, { method: 'PATCH' }),
    enableSync: (accountId: string) => request(`/bank-accounts/${accountId}/enable-sync`, { method: 'PATCH' }),
    disableSync: (accountId: string) => request(`/bank-accounts/${accountId}/disable-sync`, { method: 'PATCH' }),
    updateCredentials: (accountId: string, credentials: Record<string, string>) =>
      request(`/bank-accounts/${accountId}/credentials`, {
        method: 'PATCH',
        body: JSON.stringify({ credentials }),
      }),
  },
  movements: {
    list: (params?: URLSearchParams) => request(`/movements${params ? `?${params}` : ''}`),
  },
  syncLogs: {
    list: (accountId?: string) => request(`/sync-logs${accountId ? `?accountId=${accountId}` : ''}`),
  },
  lastSync: {
    overview: () => request('/last-sync'),
    forAccount: (accountId: string) => request(`/last-sync?accountId=${accountId}`),
  },
  auditLogs: {
    list: (params?: URLSearchParams) => request(`/audit-logs${params ? `?${params}` : ''}`),
  },
  alerts: {
    list: (params?: URLSearchParams) => request(`/alerts${params ? `?${params}` : ''}`),
  },
};
