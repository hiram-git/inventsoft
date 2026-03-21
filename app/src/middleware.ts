import { defineMiddleware } from 'astro:middleware';
import { getSession, getSucursalSession } from './lib/auth';
import { verifyToken } from './lib/tokens';
import { store } from './lib/store';
import { isSetupComplete } from './lib/setup-check';

// Pages that are accessible without a selected sucursal
const NO_SUCURSAL_PATHS = new Set(['/select-branch']);

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

  // ── Bearer token (mobile apps) ────────────────────────────────────────────
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const tokenData = verifyToken(authHeader.slice(7));
    if (tokenData) {
      const user = await store.getUsuario(tokenData.userId);
      if (user?.activo) {
        context.locals.user = { id: user.id as string, nombre: user.nombre as string, email: user.email as string, rol: user.rol as string };
        // Inject sucursal from token if present
        if (tokenData.sucursalId) {
          const sucursal = await store.getSucursal(tokenData.sucursalId);
          context.locals.sucursal = sucursal
            ? { id: String(sucursal.id), nombre: sucursal.nombre as string, almacenId: sucursal.almacenId ? String(sucursal.almacenId) : null, almacenNombre: sucursal.almacenNombre as string }
            : null;
        } else {
          context.locals.sucursal = null;
        }
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

  // ── Session cookie (web) ──────────────────────────────────────────────────
  const session = await getSession(context.cookies);
  if (!session) {
    return context.redirect('/login');
  }

  context.locals.user = session;

  // ── Sucursal ──────────────────────────────────────────────────────────────
  const sucursal = await getSucursalSession(context.cookies);

  if (!sucursal && !NO_SUCURSAL_PATHS.has(pathname)) {
    // Check if user has at least one sucursal assigned; if so, redirect to picker
    const userSucursales = await store.getSucursalesUsuario(session.id);
    if (userSucursales.length === 1) {
      // Auto-select the only available branch (import selectSucursal lazily to avoid circular)
      const { selectSucursal } = await import('./lib/auth');
      selectSucursal(context.cookies, String(userSucursales[0].id));
      context.locals.sucursal = {
        id: String(userSucursales[0].id),
        nombre: userSucursales[0].nombre as string,
        almacenId: (userSucursales[0] as any).almacenId ? String((userSucursales[0] as any).almacenId) : null,
        almacenNombre: (userSucursales[0] as any).almacenNombre as string ?? '',
      };
    } else if (userSucursales.length > 1) {
      return context.redirect('/select-branch');
    } else {
      // No sucursales assigned — allow access without branch context (admin scenario)
      context.locals.sucursal = null;
    }
  } else {
    context.locals.sucursal = sucursal;
  }

  // ── Moneda ────────────────────────────────────────────────────────────────
  try {
    const empresa = await store.getEmpresa();
    context.locals.moneda = {
      simbolo: empresa?.monedaSimbolo ?? '$',
      codigo:  empresa?.monedaCodigo  ?? 'USD',
      nombre:  empresa?.monedaNombre  ?? 'Dólar estadounidense',
    };
  } catch {
    context.locals.moneda = { simbolo: '$', codigo: 'USD', nombre: 'Dólar estadounidense' };
  }

  return next();
});
