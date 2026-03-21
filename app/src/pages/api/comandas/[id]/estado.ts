import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id     = params.id!;
  const fd     = await request.formData();
  const estado = fd.get('estado')?.toString() ?? '';

  const ESTADOS_VALIDOS = ['en_preparacion', 'lista', 'entregada', 'cancelada'];
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return new Response('Estado inválido', { status: 400 });
  }

  const comanda = await store.getComanda(id);
  if (!comanda) return new Response('Comanda no encontrada', { status: 404 });

  await store.actualizarEstadoComanda(id, estado);

  // Redirigir de vuelta a la pantalla de cocina
  return redirect('/comandas', 302);
};
