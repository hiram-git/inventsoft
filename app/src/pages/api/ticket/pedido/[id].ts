import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { imprimirTicketPedido } from '../../../../lib/ticket';

export const POST: APIRoute = async ({ params }) => {
  try {
    const pedido = await store.getPedido(params.id!);
    if (!pedido) return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), { status: 404 });
    const empresa = await store.getEmpresa();
    await imprimirTicketPedido(pedido, empresa);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? 'Error al imprimir' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
