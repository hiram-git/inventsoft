import { pgTable, serial, varchar, text, boolean, numeric, integer, date, jsonb, timestamp } from 'drizzle-orm/pg-core';

// --- Permisos ---
export const permisos = pgTable('permisos', {
  id: serial('id').primaryKey(),
  clave: varchar('clave', { length: 100 }).notNull().unique(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  modulo: varchar('modulo', { length: 100 }).notNull(),
});

// --- Roles ---
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  descripcion: text('descripcion').default(''),
  permisos: jsonb('permisos').$type<string[]>().default([]),
});

// --- Usuarios ---
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  password: varchar('password', { length: 200 }).notNull(),
  rol: varchar('rol', { length: 100 }).notNull(),
  activo: boolean('activo').default(true).notNull(),
});

// --- Unidades de Medida ---
export const unidades = pgTable('unidades', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  simbolo: varchar('simbolo', { length: 20 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).default('unidad'), // masa | volumen | longitud | tiempo | unidad | area | otro
  activo: boolean('activo').default(true).notNull(),
});

// --- Impuestos ---
export const impuestos = pgTable('impuestos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  porcentaje: numeric('porcentaje', { precision: 5, scale: 2 }).notNull(),
  aplicaA: varchar('aplica_a', { length: 20 }).default('todos'), // 'productos' | 'servicios' | 'todos'
  esPorDefecto: boolean('es_por_defecto').default(false).notNull(),
  activo: boolean('activo').default(true).notNull(),
});

// --- Monedas ---
export const monedas = pgTable('monedas', {
  id: serial('id').primaryKey(),
  codigo: varchar('codigo', { length: 10 }).notNull().unique(), // MXN, USD, EUR, PEN…
  nombre: varchar('nombre', { length: 100 }).notNull(),
  simbolo: varchar('simbolo', { length: 10 }).notNull(), // $, €, S/…
  activo: boolean('activo').default(true).notNull(),
});

// --- Tipos de Cliente (catálogo) ---
export const tiposCliente = pgTable('tipos_cliente', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion').default(''),
  activo: boolean('activo').default(true).notNull(),
});

// --- Vendedores ---
export const vendedores = pgTable('vendedores', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 300 }).notNull(),
  email: varchar('email', { length: 200 }).default(''),
  telefono: varchar('telefono', { length: 50 }).default(''),
  activo: boolean('activo').default(true).notNull(),
});

// --- Clientes ---
export const clientes = pgTable('clientes', {
  id: serial('id').primaryKey(),
  // Identificación
  nombre: varchar('nombre', { length: 300 }).notNull(),
  email: varchar('email', { length: 200 }).default(''),
  telefono: varchar('telefono', { length: 50 }).default(''),
  direccion: text('direccion').default(''),
  // Tipo de cliente
  tipoClienteId: integer('tipo_cliente_id'),
  tipoCliente: varchar('tipo_cliente', { length: 200 }).default(''),
  contribuyente: varchar('contribuyente', { length: 50 }).default(''), // 'juridico' | 'natural' | ''
  // Datos fiscales
  ruc: varchar('ruc', { length: 50 }).default(''),
  digitoVerificador: varchar('digito_verificador', { length: 10 }).default(''),
  razonSocial: varchar('razon_social', { length: 300 }).default(''),
  nombreComercial: varchar('nombre_comercial', { length: 300 }).default(''),
  // Datos administrativos
  permiteCredito: boolean('permite_credito').default(false).notNull(),
  limiteCredito: numeric('limite_credito', { precision: 12, scale: 2 }).default('0'),
  diaVencimiento: integer('dia_vencimiento').default(30),
  descuentoParcial: numeric('descuento_parcial', { precision: 5, scale: 2 }).default('0'),
  descuentoGlobal: numeric('descuento_global', { precision: 5, scale: 2 }).default('0'),
  vendedorId: integer('vendedor_id'),
  vendedor: varchar('vendedor', { length: 300 }).default(''),
  // Legado
  rfc: varchar('rfc', { length: 20 }).default(''),
  createdAt: date('created_at').defaultNow().notNull(),
});

// --- Catálogos auxiliares ---
export const departamentos = pgTable('departamentos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion').default(''),
  activo: boolean('activo').default(true).notNull(),
});

export const grupos = pgTable('grupos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion').default(''),
  activo: boolean('activo').default(true).notNull(),
});

export const marcas = pgTable('marcas', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion').default(''),
  activo: boolean('activo').default(true).notNull(),
});

export const lineas = pgTable('lineas', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion').default(''),
  activo: boolean('activo').default(true).notNull(),
});

type PrecioNivel = { precio: number; utilidad: number; precioConImpuesto: number };

// --- Productos ---
export const productos = pgTable('productos', {
  id: serial('id').primaryKey(),
  // Identificación
  codigo:     varchar('codigo',    { length: 100 }).default(''),
  referencia: varchar('referencia',{ length: 100 }).default(''),
  nombre:     varchar('nombre',    { length: 300 }).notNull(),
  // Descripciones
  descripcion:        text('descripcion').default(''),
  caracteristicas:    text('caracteristicas').default(''),
  descripcionIngles:  text('descripcion_ingles').default(''),
  descripcion2:       text('descripcion2').default(''),
  descripcion3:       text('descripcion3').default(''),
  // Clasificación (FK por nombre guardado para independencia)
  departamentoId: integer('departamento_id'),
  departamento:   varchar('departamento',  { length: 200 }).default(''),
  grupoId:        integer('grupo_id'),
  grupo:          varchar('grupo',         { length: 200 }).default(''),
  marcaId:        integer('marca_id'),
  marca:          varchar('marca',         { length: 200 }).default(''),
  lineaId:        integer('linea_id'),
  linea:          varchar('linea',         { length: 200 }).default(''),
  categoria:      varchar('categoria',     { length: 100 }).default(''), // campo legado
  // Costos y precios
  costo:   numeric('costo',   { precision: 12, scale: 2 }).default('0'),
  precio:  numeric('precio',  { precision: 12, scale: 2 }).notNull(),   // precio base (= precioA.precio)
  precioA: jsonb('precio_a').$type<PrecioNivel>(),
  precioB: jsonb('precio_b').$type<PrecioNivel>(),
  precioC: jsonb('precio_c').$type<PrecioNivel>(),
  // Inventario
  stock:              integer('stock').default(0).notNull(),
  minimoInventario:   numeric('minimo_inventario', { precision: 12, scale: 2 }).default('0'),
  maximoInventario:   numeric('maximo_inventario', { precision: 12, scale: 2 }).default('0'),
  // Tipo: 'simple' = stock propio | 'compuesto' = armado desde ingredientes | 'kit' = bundle con precio custom
  tipoProducto: varchar('tipo_producto', { length: 20 }).default('simple').notNull(),
  imagen: text('imagen').default(''),
  activo: boolean('activo').default(true).notNull(),
  // Comandas: indica si este producto debe enviarse a cocina al crear una comanda
  enviarACocina: boolean('enviar_a_cocina').default(false).notNull(),
});

// --- Servicios (no mueven inventario) ---
export const servicios = pgTable('servicios', {
  id: serial('id').primaryKey(),
  // Identificación
  codigo:     varchar('codigo',    { length: 100 }).default(''),
  referencia: varchar('referencia',{ length: 100 }).default(''),
  nombre:     varchar('nombre',    { length: 300 }).notNull(),
  // Descripciones
  descripcion:        text('descripcion').default(''),
  caracteristicas:    text('caracteristicas').default(''),
  descripcionIngles:  text('descripcion_ingles').default(''),
  descripcion2:       text('descripcion2').default(''),
  descripcion3:       text('descripcion3').default(''),
  // Clasificación
  departamentoId: integer('departamento_id'),
  departamento:   varchar('departamento',  { length: 200 }).default(''),
  grupoId:        integer('grupo_id'),
  grupo:          varchar('grupo',         { length: 200 }).default(''),
  marcaId:        integer('marca_id'),
  marca:          varchar('marca',         { length: 200 }).default(''),
  lineaId:        integer('linea_id'),
  linea:          varchar('linea',         { length: 200 }).default(''),
  categoria:      varchar('categoria',     { length: 100 }).default(''),
  // Costos y precios
  costo:   numeric('costo',  { precision: 12, scale: 2 }).default('0'),
  precio:  numeric('precio', { precision: 12, scale: 2 }).notNull(),
  precioA: jsonb('precio_a').$type<PrecioNivel>(),
  precioB: jsonb('precio_b').$type<PrecioNivel>(),
  precioC: jsonb('precio_c').$type<PrecioNivel>(),
  imagen: text('imagen').default(''),
  activo: boolean('activo').default(true).notNull(),
  // Comandas: indica si este servicio debe enviarse a cocina al crear una comanda
  enviarACocina: boolean('enviar_a_cocina').default(false).notNull(),
});

// --- Facturas ---
export const facturas = pgTable('facturas', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  clienteId: integer('cliente_id').notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 300 }).notNull(),
  almacenId: integer('almacen_id'),
  almacenNombre: varchar('almacen_nombre', { length: 200 }).default(''),
  items: jsonb('items').$type<{
    tipo: 'producto' | 'servicio';
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[]>().default([]),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  impuestoId: integer('impuesto_id'),
  impuestoNombre: varchar('impuesto_nombre', { length: 100 }).default('IVA'),
  impuestoPorcentaje: numeric('impuesto_porcentaje', { precision: 5, scale: 2 }).default('16'),
  iva: numeric('iva', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'), // pendiente | parcial | pagada | cancelada | vencida
  fecha: date('fecha').defaultNow().notNull(),
  fechaVencimiento: date('fecha_vencimiento'),
});

// --- Cobros (pagos aplicados a facturas) ---
export const cobros = pgTable('cobros', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  facturaId: integer('factura_id').notNull(),
  facturaNumero: varchar('factura_numero', { length: 20 }).notNull(),
  clienteId: integer('cliente_id').notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 300 }).notNull(),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').defaultNow().notNull(),
  metodoPago: varchar('metodo_pago', { length: 50 }).notNull().default('efectivo'), // efectivo | transferencia | cheque | tarjeta
  referencia: varchar('referencia', { length: 100 }).default(''), // Nro cheque, Nro transferencia
  notas: text('notas').default(''),
  estado: varchar('estado', { length: 20 }).notNull().default('aplicado'), // aplicado | anulado
});

// --- Empresa (config singleton, 1 row) ---
export const empresa = pgTable('empresa', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 300 }).notNull(),
  rfc: varchar('rfc', { length: 20 }).default(''),
  direccion: text('direccion').default(''),
  telefono: varchar('telefono', { length: 50 }).default(''),
  email: varchar('email', { length: 200 }).default(''),
  logo: text('logo').default(''),
  // Configuración de impresora
  // impresora_tipo: 'ticket' = impresora térmica ESC/POS | 'a4' = PDF A4 (default)
  impresoraTipo: varchar('impresora_tipo', { length: 10 }).default('a4'),
  // impresora_conexion: 'network' = WiFi/LAN | 'usb' = USB directo
  impresoraConexion: varchar('impresora_conexion', { length: 10 }).default('network'),
  impresoraHost: varchar('impresora_host', { length: 100 }).default('192.168.1.100'),
  impresoraPuerto: integer('impresora_puerto').default(9100),
  impresoraDispositivo: varchar('impresora_dispositivo', { length: 200 }).default('/dev/usb/lp0'),
  // impresora_ancho: 32 = papel 58mm | 48 = papel 80mm
  impresoraAncho: integer('impresora_ancho').default(32),
  // Moneda activa
  monedaId: integer('moneda_id'),
  monedaCodigo: varchar('moneda_codigo', { length: 10 }).default('MXN'),
  monedaNombre: varchar('moneda_nombre', { length: 100 }).default('Peso Mexicano'),
  monedaSimbolo: varchar('moneda_simbolo', { length: 10 }).default('$'),
});

// --- Almacenes ---
export const almacenes = pgTable('almacenes', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion').default(''),
  ubicacion: varchar('ubicacion', { length: 300 }).default(''),
  activo: boolean('activo').default(true).notNull(),
});

// --- Inventario (stock por almacén × producto) ---
export const inventario = pgTable('inventario', {
  id: serial('id').primaryKey(),
  almacenId: integer('almacen_id').notNull(),
  almacenNombre: varchar('almacen_nombre', { length: 200 }).notNull(),
  productoId: integer('producto_id').notNull(),
  productoNombre: varchar('producto_nombre', { length: 300 }).notNull(),
  stock: numeric('stock', { precision: 14, scale: 4 }).default('0').notNull(),
  stockReservado: numeric('stock_reservado', { precision: 14, scale: 4 }).default('0').notNull(),
});

// --- Kardex (movimientos de inventario) ---
export const kardex = pgTable('kardex', {
  id: serial('id').primaryKey(),
  almacenId: integer('almacen_id').notNull(),
  almacenNombre: varchar('almacen_nombre', { length: 200 }).notNull(),
  productoId: integer('producto_id').notNull(),
  productoNombre: varchar('producto_nombre', { length: 300 }).notNull(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'entrada' | 'salida' | 'reserva' | 'liberacion'
  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  stockAnterior: numeric('stock_anterior', { precision: 14, scale: 4 }).notNull(),
  stockNuevo: numeric('stock_nuevo', { precision: 14, scale: 4 }).notNull(),
  referencia: varchar('referencia', { length: 20 }).notNull(), // 'compra' | 'factura' | 'pedido' | 'ajuste'
  referenciaId: integer('referencia_id'),
  referenciaNumero: varchar('referencia_numero', { length: 30 }).default(''),
  notas: text('notas').default(''),
  fecha: date('fecha').defaultNow().notNull(),
});

// --- Proveedores ---
export const proveedores = pgTable('proveedores', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 300 }).notNull(),
  rfc: varchar('rfc', { length: 20 }).default(''),
  contacto: varchar('contacto', { length: 200 }).default(''),
  telefono: varchar('telefono', { length: 50 }).default(''),
  email: varchar('email', { length: 200 }).default(''),
  direccion: text('direccion').default(''),
  notas: text('notas').default(''),
  activo: boolean('activo').default(true).notNull(),
});

// --- Compras (ingresos de mercancía) ---
export const compras = pgTable('compras', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  proveedorId: integer('proveedor_id'),            // FK nullable para compat con registros previos
  proveedorNombre: varchar('proveedor_nombre', { length: 300 }).notNull(),
  almacenId: integer('almacen_id').notNull(),
  almacenNombre: varchar('almacen_nombre', { length: 200 }).notNull(),
  items: jsonb('items').$type<{
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[]>().default([]),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  impuestoId: integer('impuesto_id'),
  impuestoNombre: varchar('impuesto_nombre', { length: 100 }).default('IVA'),
  impuestoPorcentaje: numeric('impuesto_porcentaje', { precision: 5, scale: 2 }).default('16'),
  iva: numeric('iva', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'), // borrador | recibida | cancelada
  fecha: date('fecha').defaultNow().notNull(),
});

// --- Pagos a Proveedores (Cuentas por Pagar) ---
export const pagosProveedor = pgTable('pagos_proveedor', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  compraId: integer('compra_id').notNull(),
  compraNumero: varchar('compra_numero', { length: 20 }).notNull(),
  proveedorId: integer('proveedor_id'),
  proveedorNombre: varchar('proveedor_nombre', { length: 300 }).notNull(),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').defaultNow().notNull(),
  metodoPago: varchar('metodo_pago', { length: 50 }).default('transferencia'), // efectivo | transferencia | cheque | tarjeta
  referencia: varchar('referencia', { length: 100 }).default(''),  // Nro cheque / transferencia
  cuentaBancaria: varchar('cuenta_bancaria', { length: 200 }).default(''), // Banco / cuenta de origen
  notas: text('notas').default(''),
  estado: varchar('estado', { length: 20 }).default('aplicado'), // aplicado | cancelado
});

// --- Pedidos (reservas de inventario) ---
export const pedidos = pgTable('pedidos', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  clienteId: integer('cliente_id').notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 300 }).notNull(),
  almacenId: integer('almacen_id').notNull(),
  almacenNombre: varchar('almacen_nombre', { length: 200 }).notNull(),
  items: jsonb('items').$type<{
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[]>().default([]),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  impuestoId: integer('impuesto_id'),
  impuestoNombre: varchar('impuesto_nombre', { length: 100 }).default('IVA'),
  impuestoPorcentaje: numeric('impuesto_porcentaje', { precision: 5, scale: 2 }).default('16'),
  iva: numeric('iva', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'),
  notas: text('notas').default(''),
  fecha: date('fecha').defaultNow().notNull(),
});


// --- Notas de Crédito (anulación de facturas) ---
export const notasCredito = pgTable('notas_credito', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  facturaId: integer('factura_id').notNull(),
  facturaNumero: varchar('factura_numero', { length: 20 }).notNull(),
  clienteId: integer('cliente_id').notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 300 }).notNull(),
  almacenId: integer('almacen_id'),
  almacenNombre: varchar('almacen_nombre', { length: 200 }).default(''),
  items: jsonb('items').$type<{
    tipo: 'producto' | 'servicio';
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[]>().default([]),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  iva: numeric('iva', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  motivo: text('motivo').notNull().default(''),
  fecha: date('fecha').defaultNow().notNull(),
});

// --- Cotizaciones (no mueven ni reservan inventario) ---
export const cotizaciones = pgTable('cotizaciones', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  clienteId: integer('cliente_id').notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 300 }).notNull(),
  items: jsonb('items').$type<{
    tipo: 'producto' | 'servicio';
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[]>().default([]),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  impuestoId: integer('impuesto_id'),
  impuestoNombre: varchar('impuesto_nombre', { length: 100 }).default('IVA'),
  impuestoPorcentaje: numeric('impuesto_porcentaje', { precision: 5, scale: 2 }).default('16'),
  iva: numeric('iva', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'), // borrador | enviada | aceptada | rechazada | vencida | convertida
  notas: text('notas').default(''),
  fechaVencimiento: date('fecha_vencimiento'),
  fecha: date('fecha').defaultNow().notNull(),
  facturaId: integer('factura_id'),
  facturaNumero: varchar('factura_numero', { length: 20 }).default(''),
});

// --- Componentes de Producto (recetas y kits) ---
// productoId → el producto compuesto o kit
// componenteId → ingrediente / ítem individual que se descuenta del inventario
export const componentesProducto = pgTable('componentes_producto', {
  id: serial('id').primaryKey(),
  productoId: integer('producto_id').notNull(),
  componenteId: integer('componente_id').notNull(),
  componenteNombre: varchar('componente_nombre', { length: 300 }).notNull(),
  cantidad: numeric('cantidad', { precision: 12, scale: 4 }).notNull(),
  // factorConversion: multiplica cantidad × factor para obtener las unidades a descontar del inventario.
  // Ej: 100 g × 0.001 = 0.1 kg descontado del inventario si el ingrediente se lleva en kg.
  factorConversion: numeric('factor_conversion', { precision: 12, scale: 6 }).default('1'),
  unidadId: integer('unidad_id'),
  unidad: varchar('unidad', { length: 50 }).default(''),
});

// --- Comandas (órdenes de cocina) ---
export const comandas = pgTable('comandas', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  pedidoId: integer('pedido_id'),
  pedidoNumero: varchar('pedido_numero', { length: 20 }).default(''),
  mesa: varchar('mesa', { length: 50 }).default(''),
  clienteNombre: varchar('cliente_nombre', { length: 300 }).default(''),
  items: jsonb('items').$type<{
    productoId: string;
    productoNombre: string;
    cantidad: number;
    notas: string;
  }[]>().default([]),
  estado: varchar('estado', { length: 20 }).notNull().default('nueva'), // nueva | en_preparacion | lista | entregada | cancelada
  prioridad: varchar('prioridad', { length: 20 }).default('normal'),    // baja | normal | alta | urgente
  notas: text('notas').default(''),
  // Timestamps para el temporizador en tiempo real
  creadoAt: timestamp('creado_at', { withTimezone: true }).defaultNow().notNull(),
  iniciadoAt: timestamp('iniciado_at', { withTimezone: true }),
  listoAt: timestamp('listo_at', { withTimezone: true }),
  entregadoAt: timestamp('entregado_at', { withTimezone: true }),
  fecha: date('fecha').defaultNow().notNull(),
});
