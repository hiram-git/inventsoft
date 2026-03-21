import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { generateFacturaPDF } from '../../../../lib/pdf';

export const GET: APIRoute = async ({ params }) => {
  const factura = await store.getFactura(params.id!);
  if (!factura) return new Response('Not found', { status: 404 });

  const empresa = await store.getEmpresa();
  const pdf = await generateFacturaPDF(factura, empresa);

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${factura.numero}.pdf"`,
    },
  });
};
