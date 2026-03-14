import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id!;
  const { valor } = await request.json() as { valor: boolean };

  const ok = await store.updateServicio(id, { enviarACocina: Boolean(valor) });
  if (!ok) return new Response('Servicio no encontrado', { status: 404 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
