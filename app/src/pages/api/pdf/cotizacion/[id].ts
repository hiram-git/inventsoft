import type { APIRoute } from 'astro';
import { store } from '../../../../lib/store';
import { generateCotizacionPDF } from '../../../../lib/pdf';

export const GET: APIRoute = async ({ params }) => {
  const cot = await store.getCotizacion(params.id!);
  if (!cot) return new Response('Not found', { status: 404 });

  const empresa = await store.getEmpresa();
  const pdf = await generateCotizacionPDF(cot, empresa);

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cot.numero}.pdf"`,
    },
  });
};
