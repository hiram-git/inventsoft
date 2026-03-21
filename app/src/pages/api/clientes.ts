import type { APIRoute } from 'astro';
import { store } from '../../lib/store';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  const all = await store.getClientes();
  const lower = q.toLowerCase();

  const results = q.length < 2
    ? all.slice(0, 20)
    : all
        .filter(c =>
          c.nombre.toLowerCase().includes(lower) ||
          c.email?.toLowerCase().includes(lower) ||
          c.ruc?.toLowerCase().includes(lower) ||
          c.rfc?.toLowerCase().includes(lower),
        )
        .slice(0, 20);

  return new Response(
    JSON.stringify(
      results.map(c => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email ?? '',
        ruc: c.ruc ?? '',
        rfc: c.rfc ?? '',
        telefono: c.telefono ?? '',
        direccion: c.direccion ?? '',
      })),
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
