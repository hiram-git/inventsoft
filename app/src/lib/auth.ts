import type { AstroCookies } from 'astro';
import { authDb } from '../db';
import { eq } from 'drizzle-orm';
import { usuariosGlobal, empresasRegistry } from '../db/auth-schema';
import { store } from './store';

const SESSION_COOKIE  = 'session_user_id';
const EMPRESA_COOKIE  = 'session_empresa';
const SUCURSAL_COOKIE = 'session_sucursal_id';

const COOKIE_OPTS = {
  path:     '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 8, // 8 hours
};

// ── Login / logout ────────────────────────────────────────────────────────────

/** Store the global user ID in a session cookie. */
export function login(cookies: AstroCookies, globalUserId: string) {
  cookies.set(SESSION_COOKIE, globalUserId, COOKIE_OPTS);
}

export function logout(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE,  { path: '/' });
  cookies.delete(EMPRESA_COOKIE,  { path: '/' });
  cookies.delete(SUCURSAL_COOKIE, { path: '/' });
}

// ── Empresa session ───────────────────────────────────────────────────────────

export function selectEmpresa(cookies: AstroCookies, slug: string) {
  cookies.set(EMPRESA_COOKIE, slug, COOKIE_OPTS);
}

export function getEmpresaSlug(cookies: AstroCookies): string | null {
  return cookies.get(EMPRESA_COOKIE)?.value ?? null;
}

export async function getEmpresaSession(cookies: AstroCookies) {
  const slug = getEmpresaSlug(cookies);
  if (!slug) return null;
  const rows = await authDb.select().from(empresasRegistry).where(eq(empresasRegistry.slug, slug)).limit(1);
  if (!rows.length || !rows[0].activo) return null;
  return { slug: rows[0].slug, nombre: rows[0].nombre };
}

// ── Sucursal session ──────────────────────────────────────────────────────────

export function selectSucursal(cookies: AstroCookies, sucursalId: string) {
  cookies.set(SUCURSAL_COOKIE, sucursalId, COOKIE_OPTS);
}

export async function getSucursalSession(cookies: AstroCookies) {
  const sucursalId = cookies.get(SUCURSAL_COOKIE)?.value;
  if (!sucursalId) return null;
  const sucursal = await store.getSucursal(sucursalId);
  if (!sucursal) return null;
  return {
    id:            String(sucursal.id),
    nombre:        sucursal.nombre as string,
    almacenId:     sucursal.almacenId ? String(sucursal.almacenId) : null,
    almacenNombre: sucursal.almacenNombre as string,
  };
}

// ── User session ──────────────────────────────────────────────────────────────

/**
 * Resolves the current session.
 *
 * Cookie `session_user_id` stores the *global* user ID (from inventsoft_auth).
 * We look up the company-specific user record by email so that the returned
 * `id` is the company-local user ID (used by all store calls).
 */
export async function getSession(cookies: AstroCookies) {
  const globalUserId = cookies.get(SESSION_COOKIE)?.value;
  if (!globalUserId) return null;

  // 1. Fetch global user (email is the cross-reference key)
  const globalRows = await authDb
    .select()
    .from(usuariosGlobal)
    .where(eq(usuariosGlobal.id, Number(globalUserId)))
    .limit(1);
  if (!globalRows.length) return null;

  const global = globalRows[0];

  // 2. Fetch company-local user by email (uses the active request DB via Proxy)
  const localUser = await store.getUsuarioByEmail(global.email);
  if (!localUser || !localUser.activo) return null;

  return {
    id:     String(localUser.id),
    nombre: localUser.nombre as string,
    email:  localUser.email  as string,
    rol:    localUser.rol    as string,
    // Expose global ID so middleware can issue tokens
    globalId: String(global.id),
  };
}
