const BASE = import.meta.env.VITE_API_URL ?? '';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export function getToken(): string | null {
  return localStorage.getItem('inventsoft_token');
}
export function setToken(t: string) {
  localStorage.setItem('inventsoft_token', t);
}
export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('inventsoft_user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
export function clearAuth() {
  localStorage.removeItem('inventsoft_token');
  localStorage.removeItem('inventsoft_user');
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al iniciar sesión');
  localStorage.setItem('inventsoft_token', data.token);
  localStorage.setItem('inventsoft_user', JSON.stringify(data.user));
  return data.user as AuthUser;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`[${res.status}] ${msg}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  delete: <T>(path: string)               => request<T>(path, { method: 'DELETE' }),
};
