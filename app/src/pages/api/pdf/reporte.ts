import type { APIRoute } from 'astro';
import { store } from '../../../lib/store';
import { generateReportePDF } from '../../../lib/pdf';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const now = new Date();
  const mes = parseInt(url.searchParams.get('mes')  ?? String(now.getMonth() + 1));
  const año = parseInt(url.searchParams.get('año')  ?? String(now.getFullYear()));

  const [reporte, meses, empresa] = await Promise.all([
    store.getReporteVentas(mes, año),
    store.getResumenMensual(6),
    store.getEmpresa(),
  ]);

  const pdf = await generateReportePDF(reporte, meses, empresa);

  const mesesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const filename = `Reporte-Ventas-${mesesNombre[mes-1]}-${año}.pdf`;

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
