import type { APIRoute } from 'astro';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { markSetupComplete } from '../../lib/setup-check';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const {
      nombre, ruc = '', nit = '', telefono = '', email = '', direccion = '',
      adminNombre, adminEmail, adminPassword,
    } = body as Record<string, string>;

    // ── Validación básica ──────────────────────────────────────────
    if (!nombre?.trim())         return json({ error: 'El nombre de la empresa es obligatorio.' }, 400);
    if (!adminNombre?.trim())    return json({ error: 'El nombre del administrador es obligatorio.' }, 400);
    if (!adminEmail?.trim())     return json({ error: 'El correo del administrador es obligatorio.' }, 400);
    if (!adminPassword || adminPassword.length < 6)
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);

    // ── 1. Correr migraciones / push de esquema ────────────────────
    const projectRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../..'   // src/pages/api → src/pages → src → app (project root)
    );

    try {
      execSync('npm run db:push -- --force', {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env },
        timeout: 60_000,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[setup] db:push falló:', msg);
      return json({ error: `Error al crear las tablas: ${msg.slice(0, 200)}` }, 500);
    }

    // ── 2. Verificar que la empresa no exista ya (doble envío) ─────
    const existing = await db.select({ id: schema.empresa.id }).from(schema.empresa).limit(1);
    if (existing.length > 0) {
      return json({ error: 'El sistema ya está configurado.' }, 409);
    }

    // ── 3. Insertar permisos ───────────────────────────────────────
    const permisosData = [
      { clave: 'clientes.ver',          nombre: 'Ver clientes',             modulo: 'Clientes'       },
      { clave: 'clientes.crear',        nombre: 'Crear clientes',           modulo: 'Clientes'       },
      { clave: 'clientes.editar',       nombre: 'Editar clientes',          modulo: 'Clientes'       },
      { clave: 'clientes.eliminar',     nombre: 'Eliminar clientes',        modulo: 'Clientes'       },
      { clave: 'productos.ver',         nombre: 'Ver productos',            modulo: 'Productos'      },
      { clave: 'productos.crear',       nombre: 'Crear productos',          modulo: 'Productos'      },
      { clave: 'productos.editar',      nombre: 'Editar productos',         modulo: 'Productos'      },
      { clave: 'productos.eliminar',    nombre: 'Eliminar productos',       modulo: 'Productos'      },
      { clave: 'facturas.ver',          nombre: 'Ver facturas',             modulo: 'Facturas'       },
      { clave: 'facturas.crear',        nombre: 'Crear facturas',           modulo: 'Facturas'       },
      { clave: 'facturas.editar',       nombre: 'Editar facturas',          modulo: 'Facturas'       },
      { clave: 'pedidos.ver',           nombre: 'Ver pedidos',              modulo: 'Pedidos'        },
      { clave: 'pedidos.crear',         nombre: 'Crear pedidos',            modulo: 'Pedidos'        },
      { clave: 'pedidos.editar',        nombre: 'Editar pedidos',           modulo: 'Pedidos'        },
      { clave: 'inventario.ver',        nombre: 'Ver inventario',           modulo: 'Inventario'     },
      { clave: 'inventario.compras',    nombre: 'Gestionar compras',        modulo: 'Inventario'     },
      { clave: 'inventario.almacenes',  nombre: 'Gestionar almacenes',      modulo: 'Inventario'     },
      { clave: 'configuracion.ver',     nombre: 'Ver configuración',        modulo: 'Configuración'  },
      { clave: 'configuracion.editar',  nombre: 'Editar configuración',     modulo: 'Configuración'  },
      { clave: 'usuarios.ver',          nombre: 'Ver usuarios',             modulo: 'Usuarios'       },
      { clave: 'usuarios.crear',        nombre: 'Crear usuarios',           modulo: 'Usuarios'       },
      { clave: 'usuarios.editar',       nombre: 'Editar usuarios',          modulo: 'Usuarios'       },
      { clave: 'usuarios.eliminar',     nombre: 'Eliminar usuarios',        modulo: 'Usuarios'       },
    ];
    await db.insert(schema.permisos).values(permisosData);

    const allClaves = permisosData.map(p => p.clave);

    // ── 4. Insertar roles ──────────────────────────────────────────
    await db.insert(schema.roles).values([
      {
        nombre: 'Administrador',
        descripcion: 'Acceso completo al sistema',
        permisos: allClaves,
      },
      {
        nombre: 'Vendedor',
        descripcion: 'Gestión de clientes, pedidos y facturas',
        permisos: ['clientes.ver','clientes.crear','clientes.editar','productos.ver',
                   'facturas.ver','facturas.crear','facturas.editar',
                   'pedidos.ver','pedidos.crear','pedidos.editar','inventario.ver'],
      },
      {
        nombre: 'Almacén',
        descripcion: 'Gestión de productos, compras e inventario',
        permisos: ['productos.ver','productos.crear','productos.editar',
                   'inventario.ver','inventario.compras','inventario.almacenes'],
      },
    ]);

    // ── 5. Insertar empresa con los datos del formulario ───────────
    await db.insert(schema.empresa).values({
      nombre:    nombre.trim(),
      ruc:       ruc.trim(),
      nit:       nit.trim(),
      telefono:  telefono.trim(),
      email:     email.trim(),
      direccion: direccion.trim(),
      logo: '',
      monedaCodigo: 'USD',
      monedaNombre: 'Dólar estadounidense',
      monedaSimbolo: '$',
    });

    // ── 6. Crear usuario administrador ────────────────────────────
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.insert(schema.usuarios).values({
      nombre:   adminNombre.trim(),
      email:    adminEmail.trim().toLowerCase(),
      password: hashedPassword,
      rol:      'Administrador',
      activo:   true,
    });

    // ── 7. Crear la tabla secuencias con valores iniciales ────────
    await db.insert(schema.secuencias).values([
      { tipo: 'FAC', siguiente: 1 },
      { tipo: 'PED', siguiente: 1 },
      { tipo: 'COM', siguiente: 1 },
      { tipo: 'COT', siguiente: 1 },
      { tipo: 'NC',  siguiente: 1 },
      { tipo: 'COB', siguiente: 1 },
      { tipo: 'PAP', siguiente: 1 },
      { tipo: 'CMD', siguiente: 1 },
    ]).onConflictDoNothing();

    // ── 8. Marcar setup como completo ─────────────────────────────
    markSetupComplete();

    return json({ ok: true, message: 'Instalación completada exitosamente.' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[setup] Error inesperado:', err);
    return json({ error: `Error inesperado: ${msg.slice(0, 300)}` }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
