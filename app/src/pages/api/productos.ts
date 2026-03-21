import type { APIRoute } from 'astro';
import { store } from '../../lib/store';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  const [productos, servicios] = await Promise.all([
    store.getProductos(),
    store.getServicios(),
  ]);

  const lower = q.toLowerCase();

  const matchProd = q.length < 2
    ? productos.filter(p => p.activo).slice(0, 10)
    : productos
        .filter(p => p.activo && (
          p.nombre.toLowerCase().includes(lower) ||
          p.codigo?.toLowerCase().includes(lower)
        ))
        .slice(0, 10);

  const matchServ = q.length < 2
    ? servicios.filter(s => s.activo).slice(0, 10)
    : servicios
        .filter(s => s.activo && (
          s.nombre.toLowerCase().includes(lower) ||
          s.codigo?.toLowerCase().includes(lower)
        ))
        .slice(0, 10);

  const results = [
    ...matchProd.map(p => ({ id: p.id, tipo: 'producto' as const, nombre: p.nombre, codigo: p.codigo ?? '', precio: p.precio })),
    ...matchServ.map(s => ({ id: s.id, tipo: 'servicio' as const, nombre: s.nombre, codigo: s.codigo ?? '', precio: s.precio })),
  ].slice(0, 20);

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
};
