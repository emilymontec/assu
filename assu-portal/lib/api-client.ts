/**
 * `x-device-id` es lo único que distingue "este navegador" de
 * "cualquier otro" para el backend (ver AuthController.deviceContext en
 * assu-backend) — se genera una vez y se guarda en localStorage. Sin
 * esto, cada login parecería venir de un dispositivo nuevo y el 2FA
 * nunca se podría "recordar".
 */
const DEVICE_ID_KEY = 'assu_device_id';
const ACCESS_TOKEN_KEY = 'assu_access_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Almacenamiento bloqueado (ventana privada, etc.): se genera uno
    // nuevo en memoria para esta sesión de pestaña, sin romper el flujo.
    return crypto.randomUUID();
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* ignorar: sin storage no persiste entre recargas, pero la sesión actual sigue funcionando */
  }
}

export function clearAccessToken(): void {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* no-op */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'x-device-id': getOrCreateDeviceId(),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData = init?.body instanceof FormData;
  if (!isFormData && init?.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api/backend${path}`, { ...init, headers, cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message = body || res.statusText;
    try {
      message = JSON.parse(body).message ?? message;
    } catch {
      /* el backend no siempre responde JSON (ej. 401 de un guard) */
    }
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }

  return res.json() as Promise<T>;
}

export interface MerchantDto {
  id: string;
  documentType: 'CC' | 'CE' | 'NIT' | 'PASAPORTE';
  documentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface SessionDto {
  accessToken: string;
  merchant: MerchantDto;
}

export interface LoginChallengeDto {
  attemptId: string;
  canApproveFromTrustedDevice: boolean;
  emailMasked: string;
}

export interface NotificationDto {
  id: string;
  type: 'NEW_LOGIN' | 'BANK_ACCOUNT_ADDED' | 'BANK_ACCOUNT_REMOVED';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PendingApprovalDto {
  id: string;
  newDeviceLabel: string;
  createdAt: string;
  expiresAt: string;
}

/** `login()`/`verifyCode()`/`completeAttempt()` devuelven una sesión directa si no hace falta más segundo factor. */
function isSession(value: SessionDto | LoginChallengeDto): value is SessionDto {
  return 'accessToken' in value;
}

export const api = {
  register: (formData: FormData) => request<MerchantDto>('/portal/auth/register', { method: 'POST', body: formData }),
  login: (email: string, password: string) =>
    request<SessionDto | LoginChallengeDto>('/portal/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  verifyCode: (attemptId: string, code: string) =>
    request<SessionDto>('/portal/auth/login/verify-code', { method: 'POST', body: JSON.stringify({ attemptId, code }) }),
  attemptStatus: (attemptId: string) =>
    request<{ status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' }>(`/portal/auth/login/attempts/${attemptId}/status`),
  completeAttempt: (attemptId: string) =>
    request<SessionDto>(`/portal/auth/login/attempts/${attemptId}/complete`, { method: 'POST' }),
  pendingApprovals: () => request<PendingApprovalDto[]>('/portal/auth/pending-approvals'),
  approve: (id: string) => request<{ ok: true }>(`/portal/auth/pending-approvals/${id}/approve`, { method: 'PATCH' }),
  deny: (id: string) => request<{ ok: true }>(`/portal/auth/pending-approvals/${id}/deny`, { method: 'PATCH' }),
  me: () => request<MerchantDto>('/portal/auth/me'),
  notifications: {
    list: () => request<NotificationDto[]>('/portal/notifications'),
    markRead: (id: string) => request<NotificationDto>(`/portal/notifications/${id}/read`, { method: 'PATCH' }),
  },
};

export { isSession };
