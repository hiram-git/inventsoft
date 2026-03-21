import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { imprimirTicketFactura } from '../../../../lib/ticket';

export const POST: APIRoute = async ({ params }) => {
  try {
    const factura = await store.getFactura(params.id!);
    if (!factura) return new Response(JSON.stringify({ error: 'Factura no encontrada' }), { status: 404 });
    const empresa = await store.getEmpresa();
    await imprimirTicketFactura(factura, empresa);
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
