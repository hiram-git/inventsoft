import type { AstroCookies } from 'astro';
import { store } from './store';

const SESSION_COOKIE = 'session_user_id';

export function login(cookies: AstroCookies, userId: string) {
  cookies.set(SESSION_COOKIE, userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export function logout(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function getSession(cookies: AstroCookies) {
  const userId = cookies.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  const user = await store.getUsuario(userId);
  if (!user || !user.activo) return null;
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}
