import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { authDb, requestDb, getDb } from '../../../db';
import { usuariosGlobal, usuarioEmpresas, empresasRegistry } from '../../../db/auth-schema';
import { createToken } from '../../../lib/tokens';
import { store } from '../../../lib/store';

const DEFAULT_SLUG = process.env.DEFAULT_COMPANY_SLUG ?? 'public';

export const POST: APIRoute = async ({ request }) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email y contraseña son requeridos' }, 400);
    }

    // ── 1. Validate credentials against central auth ───────────────────────
    const globalRows = await authDb
      .select()
      .from(usuariosGlobal)
      .where(eq(usuariosGlobal.email, email.toLowerCase().trim()))
      .limit(1);

    const globalUser = globalRows[0] ?? null;
    const valid = globalUser ? await bcrypt.compare(password, globalUser.passwordHash) : false;

    if (!globalUser || !valid) {
      return json({ error: 'Credenciales inválidas' }, 401);
    }

    // ── 2. Get user's companies ────────────────────────────────────────────
    const empresaRows = await authDb
      .select({ slug: empresasRegistry.slug, nombre: empresasRegistry.nombre })
      .from(usuarioEmpresas)
      .innerJoin(empresasRegistry, eq(usuarioEmpresas.empresaSlug, empresasRegistry.slug))
      .where(eq(usuarioEmpresas.globalUserId, globalUser.id));

    const empresas = empresaRows.filter(e => e.slug);

    // ── 3. Determine empresa context for token ─────────────────────────────
    const empresaSlug = empresas.length === 1 ? empresas[0].slug : null;
    const slug = empresaSlug ?? DEFAULT_SLUG;

    // ── 4. Get sucursales within the resolved company context ──────────────
    const sucursales = await requestDb.run(getDb(slug), async () => {
      // Verify user exists and is active in this company
      const localUser = await store.getUsuarioByEmail(globalUser.email);
      if (!localUser || !localUser.activo) return [];
      return store.getSucursalesUsuario(String(localUser.id));
    });

    const token = createToken(
      String(globalUser.id),
      sucursales.length === 1 ? String(sucursales[0].id) : null,
      empresaSlug,
    );

    return json({
      token,
      user:      { id: String(globalUser.id), nombre: globalUser.nombre, email: globalUser.email },
      empresas:  empresas.map(e => ({ slug: e.slug, nombre: e.nombre })),
      sucursales: sucursales.map(s => ({ id: String(s.id), nombre: s.nombre })),
    });
  } catch {
    return json({ error: 'Error del sistema' }, 500);
  }
};
