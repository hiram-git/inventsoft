import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { authDb, requestDb, getDb } from '../../../db';
import { usuariosGlobal, usuarioEmpresas, empresasRegistry } from '../../../db/auth-schema';
import { selectEmpresa } from '../../../lib/auth';
import { verifyToken, createToken } from '../../../lib/tokens';
import { store } from '../../../lib/store';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { empresaSlug } = await request.json() as { empresaSlug?: string };
    if (!empresaSlug) return json({ error: 'empresaSlug es requerido.' }, 400);

    // ── Identify user ──────────────────────────────────────────────────────
    let globalUserId: number | null = null;

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const tokenData = verifyToken(authHeader.slice(7));
      globalUserId = tokenData ? Number(tokenData.userId) : null;
    }

    if (!globalUserId) {
      const cookieUserId = cookies.get('session_user_id')?.value;
      globalUserId = cookieUserId ? Number(cookieUserId) : null;
    }

    if (!globalUserId) return json({ error: 'No autorizado.' }, 401);

    // ── Validate company access ────────────────────────────────────────────
    const access = await authDb
      .select({ slug: empresasRegistry.slug, nombre: empresasRegistry.nombre, activo: empresasRegistry.activo })
      .from(usuarioEmpresas)
      .innerJoin(empresasRegistry, eq(usuarioEmpresas.empresaSlug, empresasRegistry.slug))
      .where(eq(usuarioEmpresas.globalUserId, globalUserId));

    const allowed = access.find(e => e.slug === empresaSlug && e.activo);
    if (!allowed) return json({ error: 'No tiene acceso a esa empresa.' }, 403);

    // ── Set empresa cookie (web) ───────────────────────────────────────────
    selectEmpresa(cookies, empresaSlug);

    // ── Get sucursales within company context ──────────────────────────────
    const globalUser = await authDb
      .select({ email: usuariosGlobal.email })
      .from(usuariosGlobal)
      .where(eq(usuariosGlobal.id, globalUserId))
      .limit(1);

    const sucursales = await requestDb.run(getDb(empresaSlug), async () => {
      if (!globalUser.length) return [];
      const localUser = await store.getUsuarioByEmail(globalUser[0].email);
      if (!localUser) return [];
      return store.getSucursalesUsuario(String(localUser.id));
    });

    // ── Issue updated token for mobile ─────────────────────────────────────
    const newToken = authHeader?.startsWith('Bearer ')
      ? createToken(
          String(globalUserId),
          sucursales.length === 1 ? String(sucursales[0].id) : null,
          empresaSlug,
        )
      : undefined;

    return json({
      ok: true,
      empresa:    { slug: allowed.slug, nombre: allowed.nombre },
      sucursales: sucursales.map(s => ({ id: String(s.id), nombre: s.nombre })),
      ...(newToken ? { token: newToken } : {}),
    });
  } catch {
    return json({ error: 'Error del sistema.' }, 500);
  }
};
