import type { APIRoute } from 'astro';
import { store } from '../../../lib/store';
import { getSession, selectSucursal } from '../../../lib/auth';
import { verifyToken, createToken } from '../../../lib/tokens';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { sucursalId } = await request.json() as { sucursalId?: string };

    if (!sucursalId) return json({ error: 'sucursalId es requerido.' }, 400);

    // ── Determine user identity (cookie or Bearer) ────────────────────────
    let userId: string | null = null;

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const tokenData = verifyToken(authHeader.slice(7));
      userId = tokenData?.userId ?? null;
    }

    if (!userId) {
      const session = await getSession(cookies);
      userId = session?.id ?? null;
    }

    if (!userId) return json({ error: 'No autorizado.' }, 401);

    // ── Validate user has access to the requested sucursal ────────────────
    const userSucursales = await store.getSucursalesUsuario(userId);
    const allowed = userSucursales.find(s => String(s.id) === String(sucursalId));

    if (!allowed) return json({ error: 'No tiene acceso a esa sucursal.' }, 403);

    const sucursal = await store.getSucursal(sucursalId);
    if (!sucursal) return json({ error: 'Sucursal no encontrada.' }, 404);

    // ── Apply the switch ──────────────────────────────────────────────────
    // Web: update cookie
    selectSucursal(cookies, sucursalId);

    // Mobile: issue a new token carrying the sucursal
    const newToken = authHeader?.startsWith('Bearer ')
      ? createToken(userId, sucursalId)
      : undefined;

    return json({
      ok: true,
      sucursal: {
        id:           String(sucursal.id),
        nombre:       sucursal.nombre,
        almacenId:    sucursal.almacenId ? String(sucursal.almacenId) : null,
        almacenNombre: sucursal.almacenNombre,
      },
      ...(newToken ? { token: newToken } : {}),
    });
  } catch {
    return json({ error: 'Error del sistema.' }, 500);
  }
};
