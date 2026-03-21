import { defineMiddleware } from 'astro:middleware';
import { getSession, getSucursalSession, getEmpresaSession, getEmpresaSlug, selectEmpresa } from './lib/auth';
import { verifyToken } from './lib/tokens';
import { store } from './lib/store';
import { isSetupComplete } from './lib/setup-check';
import { requestDb, getDb, authDb } from './db';
import { eq } from 'drizzle-orm';
import { usuarioEmpresas, empresasRegistry } from './db/auth-schema';

const DEFAULT_SLUG = process.env.DEFAULT_COMPANY_SLUG ?? 'public';

// Pages accessible without a selected sucursal
const NO_SUCURSAL_PATHS = new Set(['/select-branch']);
// Pages accessible without a selected empresa
const NO_EMPRESA_PATHS  = new Set(['/select-company']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Always allow setup routes — they run before any DB tables exist
  if (pathname === '/setup' || pathname.startsWith('/api/setup')) {
    return next();
  }

  // Check initial setup; redirect to wizard if not done yet
  const setupDone = await isSetupComplete();
  if (!setupDone) {
    return context.redirect('/setup');
  }

  // Public routes (login + auth API)
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return next();
  }

  // ── Determine empresa slug ───────────────────────────────────────────────────

  // ── Bearer token (mobile apps) ───────────────────────────────────────────────
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const tokenData = verifyToken(authHeader.slice(7));
    if (tokenData) {
      const slug = tokenData.empresaSlug ?? DEFAULT_SLUG;
      return requestDb.run(getDb(slug), async () => {
        const user = await store.getUsuario(tokenData.userId);
        if (user?.activo) {
          context.locals.user = {
            id:       String(user.id),
            nombre:   user.nombre as string,
            email:    user.email  as string,
            rol:      user.rol    as string,
            globalId: tokenData.userId,
          };
          context.locals.empresa = { slug, nombre: '' }; // nombre filled below if needed

          if (tokenData.sucursalId) {
            const sucursal = await store.getSucursal(tokenData.sucursalId);
            context.locals.sucursal = sucursal
              ? { id: String(sucursal.id), nombre: sucursal.nombre as string, almacenId: sucursal.almacenId ? String(sucursal.almacenId) : null, almacenNombre: sucursal.almacenNombre as string }
              : null;
          } else {
            context.locals.sucursal = null;
          }

          // Moneda
          try {
            const emp = await store.getEmpresa();
            context.locals.moneda = { simbolo: emp?.monedaSimbolo ?? '$', codigo: emp?.monedaCodigo ?? 'USD', nombre: emp?.monedaNombre ?? 'Dólar estadounidense' };
          } catch {
            context.locals.moneda = { simbolo: '$', codigo: 'USD', nombre: 'Dólar estadounidense' };
          }

          return next();
        }
        // Invalid/inactive user
        if (pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        return context.redirect('/login');
      });
    }
    // Invalid token on an API route
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // ── Session cookie (web) ──────────────────────────────────────────────────────

  // Resolve empresa slug from cookie (or auto-assign if user has only one)
  let empresaSlug = getEmpresaSlug(context.cookies);

  // If no empresa cookie yet, peek at user to find their companies
  if (!empresaSlug) {
    // We need to know the global user first — but without a slug we can't call getSession().
    // Use DEFAULT_SLUG temporarily just to read the session cookie's global user ID.
    const globalUserId = context.cookies.get('session_user_id')?.value;
    if (globalUserId) {
      const userEmpresas = await authDb
        .select({ slug: empresasRegistry.slug, nombre: empresasRegistry.nombre })
        .from(usuarioEmpresas)
        .innerJoin(empresasRegistry, eq(usuarioEmpresas.empresaSlug, empresasRegistry.slug))
        .where(eq(usuarioEmpresas.globalUserId, Number(globalUserId)));

      const active = userEmpresas.filter(e => e.slug); // all returned are active (joined)
      if (active.length === 1) {
        empresaSlug = active[0].slug;
        selectEmpresa(context.cookies, empresaSlug);
      } else if (active.length > 1 && !NO_EMPRESA_PATHS.has(pathname)) {
        return context.redirect('/select-company');
      } else if (active.length === 0) {
        // Fallback to default slug (single-tenant / setup scenario)
        empresaSlug = DEFAULT_SLUG;
        selectEmpresa(context.cookies, empresaSlug);
      }
    }
  }

  const slug = empresaSlug ?? DEFAULT_SLUG;

  return requestDb.run(getDb(slug), async () => {
    // ── Session ──────────────────────────────────────────────────────────────
    const session = await getSession(context.cookies);
    if (!session) {
      return context.redirect('/login');
    }

    context.locals.user = session;

    // ── Empresa ──────────────────────────────────────────────────────────────
    const empresa = await getEmpresaSession(context.cookies);
    context.locals.empresa = empresa;

    // ── Sucursal ─────────────────────────────────────────────────────────────
    const sucursal = await getSucursalSession(context.cookies);

    if (!sucursal && !NO_SUCURSAL_PATHS.has(pathname) && !NO_EMPRESA_PATHS.has(pathname)) {
      const userSucursales = await store.getSucursalesUsuario(session.id);
      if (userSucursales.length === 1) {
        const { selectSucursal } = await import('./lib/auth');
        selectSucursal(context.cookies, String(userSucursales[0].id));
        context.locals.sucursal = {
          id:            String(userSucursales[0].id),
          nombre:        userSucursales[0].nombre as string,
          almacenId:     (userSucursales[0] as any).almacenId ? String((userSucursales[0] as any).almacenId) : null,
          almacenNombre: (userSucursales[0] as any).almacenNombre as string ?? '',
        };
      } else if (userSucursales.length > 1) {
        return context.redirect('/select-branch');
      } else {
        context.locals.sucursal = null;
      }
    } else {
      context.locals.sucursal = sucursal;
    }

    // ── Moneda ────────────────────────────────────────────────────────────────
    try {
      const emp = await store.getEmpresa();
      context.locals.moneda = {
        simbolo: emp?.monedaSimbolo ?? '$',
        codigo:  emp?.monedaCodigo  ?? 'USD',
        nombre:  emp?.monedaNombre  ?? 'Dólar estadounidense',
      };
    } catch {
      context.locals.moneda = { simbolo: '$', codigo: 'USD', nombre: 'Dólar estadounidense' };
    }

    return next();
  });
});
