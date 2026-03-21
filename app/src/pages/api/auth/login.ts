import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { store } from '../../../lib/store';
import { createToken } from '../../../lib/tokens';

export const POST: APIRoute = async ({ request }) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email y contraseña son requeridos' }, 400);
    }

    const user = await store.getUsuarioByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !valid) {
      return json({ error: 'Credenciales inválidas' }, 401);
    }
    if (!user.activo) {
      return json({ error: 'Cuenta desactivada. Contacte al administrador.' }, 403);
    }

    const userId = String(user.id);
    const sucursales = await store.getSucursalesUsuario(userId);
    const token = createToken(userId, sucursales.length === 1 ? String(sucursales[0].id) : null);

    return json({
      token,
      user:      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      sucursales: sucursales.map(s => ({ id: String(s.id), nombre: s.nombre })),
    });
  } catch {
    return json({ error: 'Error del sistema' }, 500);
  }
};
