import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { generatePedidoPDF } from '../../../../lib/pdf';

export const GET: APIRoute = async ({ params }) => {
  const pedido = await store.getPedido(params.id!);
  if (!pedido) return new Response('Not found', { status: 404 });

  const empresa = await store.getEmpresa();
  const pdf = await generatePedidoPDF(pedido, empresa);

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pedido.numero}.pdf"`,
    },
  });
};
