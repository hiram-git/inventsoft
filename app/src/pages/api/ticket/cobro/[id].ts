import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { imprimirTicketCobro } from '../../../../lib/ticket';

export const POST: APIRoute = async ({ params }) => {
  try {
    const cobro = await store.getCobro(parseInt(params.id!));
    if (!cobro) return new Response(JSON.stringify({ error: 'Cobro no encontrado' }), { status: 404 });
    const [empresa, saldo] = await Promise.all([
      store.getEmpresa(),
      store.getSaldoFactura(cobro.facturaId),
    ]);
    // Build a mini-factura object with saldo info for the ticket
    const facturaInfo = { total: saldo.total, saldo: saldo.saldo };
    await imprimirTicketCobro(cobro, facturaInfo, empresa);
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
