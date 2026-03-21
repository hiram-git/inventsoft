import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { imprimirTicketCotizacion } from '../../../../lib/ticket';

export const POST: APIRoute = async ({ params }) => {
  try {
    const cot = await store.getCotizacion(params.id!);
    if (!cot) return new Response(JSON.stringify({ error: 'Cotización no encontrada' }), { status: 404 });
    const empresa = await store.getEmpresa();
    await imprimirTicketCotizacion(cot, empresa);
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
