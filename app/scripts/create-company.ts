#!/usr/bin/env tsx
/**
 * Company provisioning script — adds a new tenant to a running InventSoft instance.
 *
 * Usage:
 *   npx tsx scripts/create-company.ts \
 *     --slug acme \
 *     --nombre "Acme Corp" \
 *     --adminEmail admin@acme.com \
 *     --adminPassword secret123
 *
 * What it does:
 *   1. Creates the PostgreSQL schema `inventsoft_{slug}` (skipped for slug=public)
 *   2. Runs `drizzle-kit push` targeting that schema (search_path=inventsoft_{slug})
 *   3. Seeds roles, permisos, empresa, secuencias in the new schema
 *   4. Registers the company in inventsoft_auth.empresas_registry
 *   5. Creates/links the admin user in inventsoft_auth.usuarios_global + usuario_empresas
 *   6. Inserts the company-local admin row in inventsoft_{slug}.usuarios
 */

import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from '../src/db/schema.js';
import { usuariosGlobal, empresasRegistry, usuarioEmpresas } from '../src/db/auth-schema.js';
import * as authSchemaDefn from '../src/db/auth-schema.js';

// ── Parse CLI args ─────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .join(' ')
    .match(/--(\w+)\s+([^\s--][^\s]*)/g)
    ?.map(pair => {
      const [key, ...rest] = pair.replace(/^--/, '').split(/\s+/);
      return [key, rest.join(' ')];
    }) ?? []
);

const { slug, nombre, adminEmail, adminPassword } = args as Record<string, string>;

if (!slug || !nombre || !adminEmail || !adminPassword) {
  console.error('Usage: tsx scripts/create-company.ts --slug <slug> --nombre <nombre> --adminEmail <email> --adminPassword <pass>');
  process.exit(1);
}

if (!/^[a-z0-9_]+$/.test(slug)) {
  console.error('slug must be lowercase alphanumeric + underscores only');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// ── Connections ────────────────────────────────────────────────────────────────
const authClient = postgres(DATABASE_URL, { max: 1 });
const authDb = drizzle(authClient, { schema: authSchemaDefn });

const schemaName = slug === 'public' ? 'public' : `inventsoft_${slug}`;
const searchPath  = slug === 'public' ? 'public' : `${schemaName},public`;

const companyClient = postgres(DATABASE_URL, { max: 1, connection: { search_path: searchPath } });
const db = drizzle(companyClient, { schema });

async function main() {
  console.log(`\nProvisioning company: ${nombre} (slug=${slug}, schema=${schemaName})`);

  // 1. Verify auth schema exists
  const existing = await authClient`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'inventsoft_auth'
  `;
  if (!existing.length) {
    console.error('inventsoft_auth schema does not exist. Run the setup wizard first.');
    process.exit(1);
  }

  // 2. Check if slug already registered
  const alreadyRegistered = await authDb
    .select({ slug: empresasRegistry.slug })
    .from(empresasRegistry)
    .where(eq(empresasRegistry.slug, slug));

  if (alreadyRegistered.length) {
    console.error(`Company with slug "${slug}" is already registered.`);
    process.exit(1);
  }

  // 3. Create PostgreSQL schema (skip for 'public' which already exists)
  if (slug !== 'public') {
    console.log(`Creating schema: ${schemaName}`);
    await companyClient`CREATE SCHEMA IF NOT EXISTS ${companyClient.unsafe(schemaName)}`;
  }

  // 4. Run drizzle-kit push to create tables in new schema
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  console.log('Running db:push for new schema...');
  try {
    execSync('npm run db:push -- --force', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, PGSCHEMA: schemaName },
      timeout: 60_000,
    });
  } catch (e) {
    console.error('db:push failed:', e);
    process.exit(1);
  }

  // 5. Seed permisos
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

  // 6. Seed roles
  await db.insert(schema.roles).values([
    { nombre: 'Administrador', descripcion: 'Acceso completo al sistema', permisos: allClaves },
    {
      nombre: 'Vendedor', descripcion: 'Gestión de clientes, pedidos y facturas',
      permisos: ['clientes.ver','clientes.crear','clientes.editar','productos.ver',
                 'facturas.ver','facturas.crear','facturas.editar',
                 'pedidos.ver','pedidos.crear','pedidos.editar','inventario.ver'],
    },
    {
      nombre: 'Almacén', descripcion: 'Gestión de productos, compras e inventario',
      permisos: ['productos.ver','productos.crear','productos.editar',
                 'inventario.ver','inventario.compras','inventario.almacenes'],
    },
  ]);

  // 7. Seed empresa record
  await db.insert(schema.empresa).values({
    nombre, ruc: '', nit: '', telefono: '', email: adminEmail, direccion: '',
    logo: '', monedaCodigo: 'USD', monedaNombre: 'Dólar estadounidense', monedaSimbolo: '$',
  });

  // 8. Seed secuencias
  await db.insert(schema.secuencias).values([
    { tipo: 'FAC', siguiente: 1 }, { tipo: 'PED', siguiente: 1 },
    { tipo: 'COM', siguiente: 1 }, { tipo: 'COT', siguiente: 1 },
    { tipo: 'NC',  siguiente: 1 }, { tipo: 'COB', siguiente: 1 },
    { tipo: 'PAP', siguiente: 1 }, { tipo: 'CMD', siguiente: 1 },
  ]).onConflictDoNothing();

  // 9. Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const emailNorm    = adminEmail.trim().toLowerCase();

  // 10. Create or find global user
  let globalUserId: number;
  const existingGlobal = await authDb
    .select({ id: usuariosGlobal.id })
    .from(usuariosGlobal)
    .where(eq(usuariosGlobal.email, emailNorm));

  if (existingGlobal.length) {
    globalUserId = existingGlobal[0].id;
    console.log(`Global user already exists (id=${globalUserId}), linking to new company.`);
  } else {
    const inserted = await authDb.insert(usuariosGlobal).values({
      nombre: 'Administrador', email: emailNorm, passwordHash,
    }).returning({ id: usuariosGlobal.id });
    globalUserId = inserted[0].id;
  }

  // 11. Register company
  await authDb.insert(empresasRegistry).values({ slug, nombre, activo: true });

  // 12. Link user to company
  await authDb.insert(usuarioEmpresas).values({ globalUserId, empresaSlug: slug, activo: true });

  // 13. Create company-local user record
  await db.insert(schema.usuarios).values({
    nombre: 'Administrador', email: emailNorm,
    password: passwordHash, rol: 'Administrador', activo: true,
  });

  console.log(`\nDone! Company "${nombre}" (${slug}) provisioned successfully.`);
  console.log(`Admin: ${emailNorm}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => Promise.all([authClient.end(), companyClient.end()]));
