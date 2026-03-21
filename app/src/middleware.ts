import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth';
import { verifyToken } from './lib/tokens';
import { store } from './lib/store';
import { isSetupComplete } from './lib/setup-check';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Always allow the setup wizard and its API — they run before any DB tables exist
  if (pathname === '/setup' || pathname.startsWith('/api/setup')) {
    return next();
  }

  // Check if initial setup has been completed; if not, redirect to wizard
  const setupDone = await isSetupComplete();
  if (!setupDone) {
    return context.redirect('/setup');
  }

  // Public routes (login + auth API)
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return next();
  }

  // Check Bearer token (mobile apps)
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userId = verifyToken(authHeader.slice(7));
    if (userId) {
      const user = await store.getUsuario(userId);
      if (user?.activo) {
        context.locals.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
        return next();
      }
    }
    // Invalid token on an /api route → 401 JSON
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Check session cookie for web routes
  const session = await getSession(context.cookies);
  if (!session) {
    return context.redirect('/login');
  }

  context.locals.user = session;

  // Inject empresa currency config into locals
  try {
    const empresa = await store.getEmpresa();
    context.locals.moneda = {
      simbolo: empresa?.monedaSimbolo ?? '$',
      codigo: empresa?.monedaCodigo ?? 'MXN',
      nombre: empresa?.monedaNombre ?? 'Peso Mexicano',
    };
  } catch {
    context.locals.moneda = { simbolo: '$', codigo: 'MXN', nombre: 'Peso Mexicano' };
  }

  return next();
});
