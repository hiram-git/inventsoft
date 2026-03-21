import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import {
  permisos, roles, usuarios, clientes, productos, facturas, empresa,
  almacenes, inventario, kardex, compras, pedidos,
} from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log('Seeding database...');

  // Clean tables (order matters for references)
  await db.delete(kardex);
  await db.delete(inventario);
  await db.delete(pedidos);
  await db.delete(compras);
  await db.delete(almacenes);
  await db.delete(facturas);
  await db.delete(productos);
  await db.delete(clientes);
  await db.delete(usuarios);
  await db.delete(roles);
  await db.delete(permisos);
  await db.delete(empresa);

  // --- Permisos ---
  const permisosData = [
    { clave: 'clientes.ver', nombre: 'Ver clientes', modulo: 'Clientes' },
    { clave: 'clientes.crear', nombre: 'Crear clientes', modulo: 'Clientes' },
    { clave: 'clientes.editar', nombre: 'Editar clientes', modulo: 'Clientes' },
    { clave: 'clientes.eliminar', nombre: 'Eliminar clientes', modulo: 'Clientes' },
    { clave: 'productos.ver', nombre: 'Ver productos', modulo: 'Productos' },
    { clave: 'productos.crear', nombre: 'Crear productos', modulo: 'Productos' },
    { clave: 'productos.editar', nombre: 'Editar productos', modulo: 'Productos' },
    { clave: 'productos.eliminar', nombre: 'Eliminar productos', modulo: 'Productos' },
    { clave: 'facturas.ver', nombre: 'Ver facturas', modulo: 'Facturas' },
    { clave: 'facturas.crear', nombre: 'Crear facturas', modulo: 'Facturas' },
    { clave: 'facturas.editar', nombre: 'Editar facturas', modulo: 'Facturas' },
    { clave: 'pedidos.ver', nombre: 'Ver pedidos', modulo: 'Pedidos' },
    { clave: 'pedidos.crear', nombre: 'Crear pedidos', modulo: 'Pedidos' },
    { clave: 'pedidos.editar', nombre: 'Editar pedidos', modulo: 'Pedidos' },
    { clave: 'inventario.ver', nombre: 'Ver inventario', modulo: 'Inventario' },
    { clave: 'inventario.compras', nombre: 'Gestionar compras', modulo: 'Inventario' },
    { clave: 'inventario.almacenes', nombre: 'Gestionar almacenes', modulo: 'Inventario' },
    { clave: 'configuracion.ver', nombre: 'Ver configuración', modulo: 'Configuración' },
    { clave: 'configuracion.editar', nombre: 'Editar configuración', modulo: 'Configuración' },
    { clave: 'usuarios.ver', nombre: 'Ver usuarios', modulo: 'Usuarios' },
    { clave: 'usuarios.crear', nombre: 'Crear usuarios', modulo: 'Usuarios' },
    { clave: 'usuarios.editar', nombre: 'Editar usuarios', modulo: 'Usuarios' },
    { clave: 'usuarios.eliminar', nombre: 'Eliminar usuarios', modulo: 'Usuarios' },
  ];
  await db.insert(permisos).values(permisosData);
  console.log(`  ✓ ${permisosData.length} permisos`);

  const allPermisoClaves = permisosData.map(p => p.clave);

  // --- Roles ---
  const rolesData = [
    {
      nombre: 'Administrador',
      descripcion: 'Acceso completo al sistema',
      permisos: allPermisoClaves,
    },
    {
      nombre: 'Vendedor',
      descripcion: 'Gestión de clientes, pedidos y facturas',
      permisos: ['clientes.ver', 'clientes.crear', 'clientes.editar', 'productos.ver', 'facturas.ver', 'facturas.crear', 'facturas.editar', 'pedidos.ver', 'pedidos.crear', 'pedidos.editar', 'inventario.ver'],
    },
    {
      nombre: 'Almacén',
      descripcion: 'Gestión de productos, compras e inventario',
      permisos: ['productos.ver', 'productos.crear', 'productos.editar', 'inventario.ver', 'inventario.compras', 'inventario.almacenes'],
    },
  ];
  await db.insert(roles).values(rolesData);
  console.log(`  ✓ ${rolesData.length} roles`);

  // --- Usuarios ---
  const usuariosData = [
    { nombre: 'Admin', email: 'admin@portal.com', password: await bcrypt.hash('admin123', 10), rol: 'Administrador', activo: true },
    { nombre: 'Carlos Vendedor', email: 'carlos@portal.com', password: await bcrypt.hash('123456', 10), rol: 'Vendedor', activo: true },
  ];
  await db.insert(usuarios).values(usuariosData);
  console.log(`  ✓ ${usuariosData.length} usuarios`);

  // --- Clientes ---
  const clientesData = [
    { nombre: 'Empresa ABC S.A.', email: 'contacto@abc.com', telefono: '555-0101', direccion: 'Av. Reforma 100, CDMX', rfc: 'ABC010101AAA', createdAt: '2025-01-15' },
    { nombre: 'Distribuidora XYZ', email: 'ventas@xyz.com', telefono: '555-0202', direccion: 'Calle 5 de Mayo 200, Puebla', rfc: 'XYZ020202BBB', createdAt: '2025-02-10' },
    { nombre: 'Comercial del Norte', email: 'info@cdnorte.com', telefono: '555-0303', direccion: 'Blvd. Independencia 300, Monterrey', rfc: 'CDN030303CCC', createdAt: '2025-03-05' },
  ];
  const insertedClientes = await db.insert(clientes).values(clientesData).returning();
  console.log(`  ✓ ${clientesData.length} clientes`);

  // --- Productos ---
  const productosData = [
    { nombre: 'Laptop Pro 15"', descripcion: 'Laptop profesional 16GB RAM, 512GB SSD', precio: '24999.99', stock: 15, categoria: 'Electrónica', activo: true },
    { nombre: 'Monitor 27" 4K', descripcion: 'Monitor UHD IPS 27 pulgadas', precio: '8999.99', stock: 30, categoria: 'Electrónica', activo: true },
    { nombre: 'Teclado Mecánico', descripcion: 'Teclado mecánico RGB switches blue', precio: '1999.99', stock: 50, categoria: 'Periféricos', activo: true },
    { nombre: 'Mouse Ergonómico', descripcion: 'Mouse vertical inalámbrico', precio: '899.99', stock: 40, categoria: 'Periféricos', activo: true },
    { nombre: 'Silla Ejecutiva', descripcion: 'Silla ergonómica con soporte lumbar', precio: '5999.99', stock: 10, categoria: 'Mobiliario', activo: true },
  ];
  const insertedProductos = await db.insert(productos).values(productosData).returning();
  console.log(`  ✓ ${productosData.length} productos`);

  // --- Empresa ---
  await db.insert(empresa).values({
    nombre: 'Mi Empresa S.A. de C.V.',
    rfc: 'MEM010101AAA',
    direccion: 'Av. Principal 500, Col. Centro, CDMX',
    telefono: '555-1234',
    email: 'contacto@miempresa.com',
    logo: '',
  });
  console.log('  ✓ 1 empresa');

  // --- Almacenes ---
  const almacenesData = [
    { nombre: 'Almacén Central', descripcion: 'Almacén principal de operaciones', ubicacion: 'Bodega A, Av. Industrial 500, CDMX', activo: true },
    { nombre: 'Almacén Norte', descripcion: 'Sucursal norte del país', ubicacion: 'Parque Industrial Norte, Monterrey', activo: true },
  ];
  const insertedAlmacenes = await db.insert(almacenes).values(almacenesData).returning();
  console.log(`  ✓ ${almacenesData.length} almacenes`);

  const alm1 = insertedAlmacenes[0];
  const alm2 = insertedAlmacenes[1];
  const p1 = insertedProductos[0];
  const p2 = insertedProductos[1];
  const p3 = insertedProductos[2];
  const p4 = insertedProductos[3];
  const p5 = insertedProductos[4];
  const c1 = insertedClientes[0];
  const c2 = insertedClientes[1];

  // --- Compras ---
  const comprasData = [
    {
      numero: 'COM-001',
      proveedorNombre: 'TechSupply S.A.',
      almacenId: alm1.id,
      almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 20, precioUnitario: 18000, subtotal: 360000 },
        { productoId: String(p2.id), productoNombre: p2.nombre, cantidad: 30, precioUnitario: 6000, subtotal: 180000 },
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 50, precioUnitario: 1200, subtotal: 60000 },
      ],
      subtotal: '600000.00',
      iva: '96000.00',
      total: '696000.00',
      estado: 'recibida',
      fecha: '2025-05-01',
    },
    {
      numero: 'COM-002',
      proveedorNombre: 'Periféricos MX',
      almacenId: alm1.id,
      almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p4.id), productoNombre: p4.nombre, cantidad: 40, precioUnitario: 600, subtotal: 24000 },
        { productoId: String(p5.id), productoNombre: p5.nombre, cantidad: 10, precioUnitario: 4000, subtotal: 40000 },
      ],
      subtotal: '64000.00',
      iva: '10240.00',
      total: '74240.00',
      estado: 'recibida',
      fecha: '2025-05-15',
    },
    {
      numero: 'COM-003',
      proveedorNombre: 'TechSupply S.A.',
      almacenId: alm2.id,
      almacenNombre: alm2.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 10, precioUnitario: 18000, subtotal: 180000 },
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 25, precioUnitario: 1200, subtotal: 30000 },
      ],
      subtotal: '210000.00',
      iva: '33600.00',
      total: '243600.00',
      estado: 'recibida',
      fecha: '2025-06-01',
    },
  ];
  await db.insert(compras).values(comprasData);
  console.log(`  ✓ ${comprasData.length} compras`);

  // --- Inventario ---
  const inventarioData = [
    // Almacén Central
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p1.id, productoNombre: p1.nombre, stock: 18, stockReservado: 2 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p2.id, productoNombre: p2.nombre, stock: 28, stockReservado: 0 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p3.id, productoNombre: p3.nombre, stock: 40, stockReservado: 5 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p4.id, productoNombre: p4.nombre, stock: 35, stockReservado: 0 },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p5.id, productoNombre: p5.nombre, stock: 8, stockReservado: 0 },
    // Almacén Norte
    { almacenId: alm2.id, almacenNombre: alm2.nombre, productoId: p1.id, productoNombre: p1.nombre, stock: 10, stockReservado: 0 },
    { almacenId: alm2.id, almacenNombre: alm2.nombre, productoId: p3.id, productoNombre: p3.nombre, stock: 25, stockReservado: 0 },
  ];
  await db.insert(inventario).values(inventarioData);
  console.log(`  ✓ ${inventarioData.length} registros de inventario`);

  // --- Kardex ---
  const kardexData = [
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p1.id, productoNombre: p1.nombre, tipo: 'entrada', cantidad: 20, stockAnterior: 0, stockNuevo: 20, referencia: 'compra', referenciaId: 1, referenciaNumero: 'COM-001', notas: 'Recepción de compra COM-001', fecha: '2025-05-01' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p2.id, productoNombre: p2.nombre, tipo: 'entrada', cantidad: 30, stockAnterior: 0, stockNuevo: 30, referencia: 'compra', referenciaId: 1, referenciaNumero: 'COM-001', notas: 'Recepción de compra COM-001', fecha: '2025-05-01' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p3.id, productoNombre: p3.nombre, tipo: 'entrada', cantidad: 50, stockAnterior: 0, stockNuevo: 50, referencia: 'compra', referenciaId: 1, referenciaNumero: 'COM-001', notas: 'Recepción de compra COM-001', fecha: '2025-05-01' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p4.id, productoNombre: p4.nombre, tipo: 'entrada', cantidad: 40, stockAnterior: 0, stockNuevo: 40, referencia: 'compra', referenciaId: 2, referenciaNumero: 'COM-002', notas: 'Recepción de compra COM-002', fecha: '2025-05-15' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p5.id, productoNombre: p5.nombre, tipo: 'entrada', cantidad: 10, stockAnterior: 0, stockNuevo: 10, referencia: 'compra', referenciaId: 2, referenciaNumero: 'COM-002', notas: 'Recepción de compra COM-002', fecha: '2025-05-15' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p1.id, productoNombre: p1.nombre, tipo: 'salida', cantidad: 2, stockAnterior: 20, stockNuevo: 18, referencia: 'factura', referenciaId: 1, referenciaNumero: 'FAC-001', notas: 'Salida por factura FAC-001', fecha: '2025-06-15' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p2.id, productoNombre: p2.nombre, tipo: 'salida', cantidad: 2, stockAnterior: 30, stockNuevo: 28, referencia: 'factura', referenciaId: 1, referenciaNumero: 'FAC-001', notas: 'Salida por factura FAC-001', fecha: '2025-06-15' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p3.id, productoNombre: p3.nombre, tipo: 'reserva', cantidad: 5, stockAnterior: 50, stockNuevo: 45, referencia: 'pedido', referenciaId: 1, referenciaNumero: 'PED-001', notas: 'Reserva por pedido PED-001', fecha: '2025-07-01' },
    { almacenId: alm1.id, almacenNombre: alm1.nombre, productoId: p1.id, productoNombre: p1.nombre, tipo: 'reserva', cantidad: 2, stockAnterior: 18, stockNuevo: 16, referencia: 'pedido', referenciaId: 1, referenciaNumero: 'PED-001', notas: 'Reserva por pedido PED-001', fecha: '2025-07-01' },
    { almacenId: alm2.id, almacenNombre: alm2.nombre, productoId: p1.id, productoNombre: p1.nombre, tipo: 'entrada', cantidad: 10, stockAnterior: 0, stockNuevo: 10, referencia: 'compra', referenciaId: 3, referenciaNumero: 'COM-003', notas: 'Recepción de compra COM-003', fecha: '2025-06-01' },
    { almacenId: alm2.id, almacenNombre: alm2.nombre, productoId: p3.id, productoNombre: p3.nombre, tipo: 'entrada', cantidad: 25, stockAnterior: 0, stockNuevo: 25, referencia: 'compra', referenciaId: 3, referenciaNumero: 'COM-003', notas: 'Recepción de compra COM-003', fecha: '2025-06-01' },
  ];
  await db.insert(kardex).values(kardexData as typeof kardex.$inferInsert[]);
  console.log(`  ✓ ${kardexData.length} movimientos de kardex`);

  // --- Facturas ---
  const facturasData = [
    {
      numero: 'FAC-001',
      clienteId: c1.id,
      clienteNombre: c1.nombre,
      almacenId: alm1.id,
      almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 2, precioUnitario: 24999.99, subtotal: 49999.98 },
        { productoId: String(p2.id), productoNombre: p2.nombre, cantidad: 2, precioUnitario: 8999.99, subtotal: 17999.98 },
      ],
      subtotal: '67999.96',
      iva: '10879.99',
      total: '78879.95',
      estado: 'pagada',
      fecha: '2025-06-15',
    },
    {
      numero: 'FAC-002',
      clienteId: c2.id,
      clienteNombre: c2.nombre,
      items: [
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 10, precioUnitario: 1999.99, subtotal: 19999.90 },
        { productoId: String(p4.id), productoNombre: p4.nombre, cantidad: 10, precioUnitario: 899.99, subtotal: 8999.90 },
      ],
      subtotal: '28999.80',
      iva: '4639.97',
      total: '33639.77',
      estado: 'pendiente',
      fecha: '2025-07-20',
    },
  ];
  await db.insert(facturas).values(facturasData);
  console.log(`  ✓ ${facturasData.length} facturas`);

  // --- Pedidos ---
  const pedidosData = [
    {
      numero: 'PED-001',
      clienteId: c2.id,
      clienteNombre: c2.nombre,
      almacenId: alm1.id,
      almacenNombre: alm1.nombre,
      items: [
        { productoId: String(p1.id), productoNombre: p1.nombre, cantidad: 2, precioUnitario: 24999.99, subtotal: 49999.98 },
        { productoId: String(p3.id), productoNombre: p3.nombre, cantidad: 5, precioUnitario: 1999.99, subtotal: 9999.95 },
      ],
      subtotal: '59999.93',
      iva: '9599.99',
      total: '69599.92',
      estado: 'confirmado',
      notas: 'Entrega urgente, pedido prioritario.',
      fecha: '2025-07-01',
    },
  ];
  await db.insert(pedidos).values(pedidosData);
  console.log(`  ✓ ${pedidosData.length} pedidos`);

  console.log('\nSeed completed!');
  await client.end();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
