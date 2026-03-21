import type { AstroCookies } from 'astro';
import { store } from './store';

const SESSION_COOKIE   = 'session_user_id';
const SUCURSAL_COOKIE  = 'session_sucursal_id';

// ── Login / logout ────────────────────────────────────────────────────────────

export function login(cookies: AstroCookies, userId: string) {
  cookies.set(SESSION_COOKIE, userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export function logout(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE,  { path: '/' });
  cookies.delete(SUCURSAL_COOKIE, { path: '/' });
}

// ── Sucursal session ──────────────────────────────────────────────────────────

export function selectSucursal(cookies: AstroCookies, sucursalId: string) {
  cookies.set(SUCURSAL_COOKIE, sucursalId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  });
}

export async function getSucursalSession(cookies: AstroCookies) {
  const sucursalId = cookies.get(SUCURSAL_COOKIE)?.value;
  if (!sucursalId) return null;
  const sucursal = await store.getSucursal(sucursalId);
  if (!sucursal) return null;
  return {
    id:           String(sucursal.id),
    nombre:       sucursal.nombre as string,
    almacenId:    sucursal.almacenId ? String(sucursal.almacenId) : null,
    almacenNombre: sucursal.almacenNombre as string,
  };
}

// ── User session ──────────────────────────────────────────────────────────────

export async function getSession(cookies: AstroCookies) {
  const userId = cookies.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  const user = await store.getUsuario(userId);
  if (!user || !user.activo) return null;
  return { id: user.id as string, nombre: user.nombre as string, email: user.email as string, rol: user.rol as string };
}
