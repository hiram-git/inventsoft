import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import * as authSchemaDefn from './auth-schema';

const DEFAULT_SLUG = process.env.DEFAULT_COMPANY_SLUG ?? 'public';

const connectionString = process.env.DATABASE_URL!;
const rawClient  = postgres(connectionString);
const authClient = postgres(connectionString, { max: 1 });
const db     = drizzle(rawClient,  { schema });
const authDb = drizzle(authClient, { schema: authSchemaDefn });

async function seed() {
  console.log('Seeding demo data…\n');

  // ── Verificar que el wizard ya fue ejecutado ───────────────────────────────
  const [empresaExistente] = await db.select({ id: schema.empresa.id }).from(schema.empresa).limit(1);
  if (!empresaExistente) {
    console.error('ERROR: No se encontró ninguna empresa. Ejecuta el wizard de instalación primero (/setup).');
    process.exit(1);
  }

  // ── Usuario de demo adicional ──────────────────────────────────────────────
  // Solo se crea si no existe (no pisa al admin del wizard)
  const demoEmail = 'vendedor@demo.com';
  const demoPassword = 'demo123';

  const existeLocal = await db.select({ id: schema.usuarios.id })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.email, demoEmail))
    .limit(1);

  let demoUserId: number | null = null;

  if (!existeLocal.length) {
    const hash = await bcrypt.hash(demoPassword, 10);

    const [localUser] = await db.insert(schema.usuarios).values({
      nombre:   'Vendedor Demo',
      email:    demoEmail,
      password: hash,
      rol:      'Vendedor',
      activo:   true,
    }).returning({ id: schema.usuarios.id });

    demoUserId = localUser.id;

    // Sincronizar con auth central
    const existeGlobal = await authDb
      .select({ id: authSchemaDefn.usuariosGlobal.id })
      .from(authSchemaDefn.usuariosGlobal)
      .where(eq(authSchemaDefn.usuariosGlobal.email, demoEmail))
      .limit(1);

    let globalUserId: number;
    if (existeGlobal.length) {
      globalUserId = existeGlobal[0].id;
    } else {
      const [globalUser] = await authDb.insert(authSchemaDefn.usuariosGlobal).values({
        nombre:       'Vendedor Demo',
        email:        demoEmail,
        passwordHash: hash,
      }).returning({ id: authSchemaDefn.usuariosGlobal.id });
      globalUserId = globalUser.id;
    }

    await authDb.insert(authSchemaDefn.usuarioEmpresas).values({
      globalUserId,
      empresaSlug: DEFAULT_SLUG,
      activo:      true,
    }).onConflictDoNothing();

    console.log(`  ✓ Usuario demo: ${demoEmail} / ${demoPassword}`);
  } else {
    demoUserId = existeLocal[0].id as number;
    console.log(`  · Usuario demo ya existe (${demoEmail}), omitido.`);
  }

  // Asignar usuario demo a la sucursal principal si existe
  const [sucursalPrincipal] = await db.select({ id: schema.sucursales.id })
    .from(schema.sucursales).limit(1);
  if (sucursalPrincipal && demoUserId) {
    await db.insert(schema.usuarioSucursales).values({
      usuarioId:  demoUserId,
      sucursalId: sucursalPrincipal.id,
    }).onConflictDoNothing();
  }

  // ── Limpiar solo datos transaccionales de demo ─────────────────────────────
  await db.delete(schema.kardex);
  await db.delete(schema.inventario);
  await db.delete(schema.pedidos);
  await db.delete(schema.compras);
  await db.delete(schema.facturas);
  await db.delete(schema.productos);
  await db.delete(schema.clientes);
  await db.delete(schema.almacenes);
  console.log('  ✓ Tablas transaccionales limpiadas');

  // ── Almacenes ──────────────────────────────────────────────────────────────
  const almacenesData = [
    { nombre: 'Almacén Central', descripcion: 'Almacén principal de operaciones', ubicacion: 'Bodega A, Av. Industrial 500', activo: true },
    { nombre: 'Almacén Norte',   descripcion: 'Sucursal norte del país',           ubicacion: 'Parque Industrial Norte',      activo: true },
  ];
  const insertedAlmacenes = await db.insert(schema.almacenes).values(almacenesData).returning();
  console.log(`  ✓ ${almacenesData.length} almacenes`);

  const [alm1, alm2] = insertedAlmacenes;

  // ── Clientes ───────────────────────────────────────────────────────────────
  const clientesData = [
    { nombre: 'Empresa ABC S.A.',      email: 'contacto@abc.com',   telefono: '555-0101', direccion: 'Av. Reforma 100, CDMX' },
    { nombre: 'Distribuidora XYZ',     email: 'ventas@xyz.com',     telefono: '555-0202', direccion: 'Calle 5 de Mayo 200' },
    { nombre: 'Comercial del Norte',   email: 'info@cdnorte.com',   telefono: '555-0303', direccion: 'Blvd. Independencia 300' },
  ];
  const insertedClientes = await db.insert(schema.clientes).values(clientesData).returning();
  console.log(`  ✓ ${clientesData.length} clientes`);

  const [c1, c2] = insertedClientes;

  // ── Productos ──────────────────────────────────────────────────────────────
  const productosData = [
    { nombre: 'Laptop Pro 15"',    descripcion: 'Laptop profesional 16GB RAM, 512GB SSD', precio: '24999.99', stock: 15, activo: true },
    { nombre: 'Monitor 27" 4K',    descripcion: 'Monitor UHD IPS 27 pulgadas',             precio: '8999.99',  stock: 30, activo: true },
    { nombre: 'Teclado Mecánico',  descripcion: 'Teclado mecánico RGB switches blue',       precio: '1999.99',  stock: 50, activo: true },
    { nombre: 'Mouse Ergonómico',  descripcion: 'Mouse vertical inalámbrico',               precio: '899.99',   stock: 40, activo: true },
    { nombre: 'Silla Ejecutiva',   descripcion: 'Silla ergonómica con soporte lumbar',      precio: '5999.99',  stock: 10, activo: true },
  ];
  const insertedProductos = await db.insert(schema.productos).values(productosData).returning();
  console.log(`  ✓ ${productosData.length} productos`);

  const [p1, p2, p3, p4, p5] = insertedProductos;

  // ── Compras ────────────────────────────────────────────────────────────────
  await db.insert(schema.compras).values([
    {
      numero: 'COM-001', proveedorNombre: 'TechSupply S.A.',
      almacenId: alm1.id, almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 20, precioUnitario: 18000, subtotal: 360000 },
        { productoId: String(p2.id), productoNombre: p2.nombre, cantidad: 30, precioUnitario: 6000,  subtotal: 180000 },
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 50, precioUnitario: 1200,  subtotal: 60000  },
      ],
      subtotal: '600000.00', iva: '96000.00', total: '696000.00',
      estado: 'recibida', fecha: '2025-05-01',
    },
    {
      numero: 'COM-002', proveedorNombre: 'Periféricos MX',
      almacenId: alm1.id, almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p4.id), productoNombre: p4.nombre, cantidad: 40, precioUnitario: 600,  subtotal: 24000 },
        { productoId: String(p5.id), productoNombre: p5.nombre, cantidad: 10, precioUnitario: 4000, subtotal: 40000 },
      ],
      subtotal: '64000.00', iva: '10240.00', total: '74240.00',
      estado: 'recibida', fecha: '2025-05-15',
    },
  ]);
  console.log('  ✓ 2 compras');

  // ── Inventario ─────────────────────────────────────────────────────────────
  await db.insert(schema.inventario).values([
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p1.id, productoNombre: p1.nombre, stock: 18, stockReservado: 2 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p2.id, productoNombre: p2.nombre, stock: 28, stockReservado: 0 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p3.id, productoNombre: p3.nombre, stock: 40, stockReservado: 5 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p4.id, productoNombre: p4.nombre, stock: 35, stockReservado: 0 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p5.id, productoNombre: p5.nombre, stock: 8,  stockReservado: 0 },
    { almacenId: alm2.id, almacenNombre: alm2.nombre, productoId: p1.id, productoNombre: p1.nombre, stock: 10, stockReservado: 0 },
    { almacenId: alm2.id, almacenNombre: alm2.nombre, productoId: p3.id, productoNombre: p3.nombre, stock: 25, stockReservado: 0 },
  ]);
  console.log('  ✓ 7 registros de inventario');

  // ── Facturas ───────────────────────────────────────────────────────────────
  await db.insert(schema.facturas).values([
    {
      numero: 'FAC-001', clienteId: c1.id, clienteNombre: c1.nombre,
      almacenId: alm1.id, almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 2, precioUnitario: 24999.99, subtotal: 49999.98 },
        { productoId: String(p2.id), productoNombre: p2.nombre, cantidad: 2, precioUnitario: 8999.99,  subtotal: 17999.98 },
      ],
      subtotal: '67999.96', iva: '10879.99', total: '78879.95',
      estado: 'pagada', fecha: '2025-06-15',
    },
    {
      numero: 'FAC-002', clienteId: c2.id, clienteNombre: c2.nombre,
      items: [
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 10, precioUnitario: 1999.99, subtotal: 19999.90 },
        { productoId: String(p4.id), productoNombre: p4.nombre, cantidad: 10, precioUnitario: 899.99,  subtotal: 8999.90  },
      ],
      subtotal: '28999.80', iva: '4639.97', total: '33639.77',
      estado: 'pendiente', fecha: '2025-07-20',
    },
  ]);
  console.log('  ✓ 2 facturas');

  // ── Pedidos ────────────────────────────────────────────────────────────────
  await db.insert(schema.pedidos).values([
    {
      numero: 'PED-001', clienteId: c2.id, clienteNombre: c2.nombre,
      almacenId: alm1.id, almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 2, precioUnitario: 24999.99, subtotal: 49999.98 },
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 5, precioUnitario: 1999.99,  subtotal: 9999.95  },
      ],
      subtotal: '59999.93', iva: '9599.99', total: '69599.92',
      estado: 'confirmado', notas: 'Entrega urgente.', fecha: '2025-07-01',
    },
  ]);
  console.log('  ✓ 1 pedido');

  console.log('\nSeed completado exitosamente.');
  console.log(`\nCredenciales de demo:`);
  console.log(`  Vendedor: ${demoEmail} / ${demoPassword}`);
  console.log(`  Admin:    usa las credenciales que ingresaste en el wizard de instalación`);
}

seed()
  .catch(e => { console.error('Seed falló:', e); process.exit(1); })
  .finally(() => Promise.all([rawClient.end(), authClient.end()]));
