import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth';
import { store } from './lib/store';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return next();
  }

  // Check session for all other routes
  const session = await getSession(context.cookies);
  if (!session) {
    return context.redirect('/login');
  }

  context.locals.user = session;

  // Inject empresa currency config into locals
  try {
    const empresa = await store.getEmpresa();
    context.locals.moneda = {
      simbolo: empresa?.monedaSimbolo ?? '$',
      codigo: empresa?.monedaCodigo ?? 'MXN',
      nombre: empresa?.monedaNombre ?? 'Peso Mexicano',
    };
  } catch {
    context.locals.moneda = { simbolo: '$', codigo: 'MXN', nombre: 'Peso Mexicano' };
  }

  return next();
});
