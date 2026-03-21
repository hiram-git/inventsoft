import type { APIRoute } from 'astro';
import { store } from '../../../lib/store';

export const GET: APIRoute = async () => {
  const comandas = await store.getComandasActivas();
  return new Response(JSON.stringify(comandas), {
    headers: { 'Content-Type': 'application/json' },
  });
};
