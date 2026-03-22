import { db } from '../db';
import { eq, sql, and, desc, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';

// ── Secuencias helper ─────────────────────────────────────────────────────────
// Returns the next available sequence number for a document type, atomically.
// Falls back to count(*)+1 on first use (handles existing databases).
async function _nextSecuencia(tipo: string): Promise<number> {
  const updated = await db
    .update(schema.secuencias)
    .set({ siguiente: sql`${schema.secuencias.siguiente} + 1` })
    .where(eq(schema.secuencias.tipo, tipo))
    .returning({ siguiente: schema.secuencias.siguiente });

  if (updated.length > 0) return updated[0].siguiente - 1;

  // Row doesn't exist: seed from current count so existing numbering isn't broken
  const countMap: Record<string, () => Promise<number>> = {
    FAC: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.facturas))[0].c),
    PED: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.pedidos))[0].c),
    COM: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.compras))[0].c),
    COT: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.cotizaciones))[0].c),
    NC:  async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.notasCredito))[0].c),
    COB: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.cobros))[0].c),
    PAP: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.pagosProveedor))[0].c),
    CMD: async () => Number((await db.select({ c: sql<number>`count(*)` }).from(schema.comandas))[0].c),
  };
  const existing = countMap[tipo] ? await countMap[tipo]() : 0;
  const num = existing + 1;
  try {
    await db.insert(schema.secuencias).values({ tipo, siguiente: num + 1 });
  } catch {
    // Concurrent insert won – retry update
    const retry = await db
      .update(schema.secuencias)
      .set({ siguiente: sql`${schema.secuencias.siguiente} + 1` })
      .where(eq(schema.secuencias.tipo, tipo))
      .returning({ siguiente: schema.secuencias.siguiente });
    if (retry.length > 0) return retry[0].siguiente - 1;
  }
  return num;
}

// Re-export types inferred from schema
export type User = typeof schema.usuarios.$inferSelect;
export type Cliente = typeof schema.clientes.$inferSelect;
export type Producto = typeof schema.productos.$inferSelect;
export type Factura = typeof schema.facturas.$inferSelect;
export type Empresa = typeof schema.empresa.$inferSelect;
export type Rol = typeof schema.roles.$inferSelect;
export type Permiso = typeof schema.permisos.$inferSelect;
export type Almacen = typeof schema.almacenes.$inferSelect;
export type InventarioRow = typeof schema.inventario.$inferSelect;
export type KardexRow = typeof schema.kardex.$inferSelect;
export type Compra = typeof schema.compras.$inferSelect;
export type Proveedor = typeof schema.proveedores.$inferSelect;
export type PagoProveedor = typeof schema.pagosProveedor.$inferSelect;
export type Pedido = typeof schema.pedidos.$inferSelect;
export type Servicio = typeof schema.servicios.$inferSelect;
export type NotaCredito = typeof schema.notasCredito.$inferSelect;
export type Cobro = typeof schema.cobros.$inferSelect;
export type Cotizacion = typeof schema.cotizaciones.$inferSelect;
export type Departamento = typeof schema.departamentos.$inferSelect;
export type Grupo = typeof schema.grupos.$inferSelect;
export type Marca = typeof schema.marcas.$inferSelect;
export type Linea = typeof schema.lineas.$inferSelect;
export type TipoCliente = typeof schema.tiposCliente.$inferSelect;
export type Vendedor = typeof schema.vendedores.$inferSelect;
export type ComponenteProducto = typeof schema.componentesProducto.$inferSelect;
export type Comanda = typeof schema.comandas.$inferSelect;
export type Unidad = typeof schema.unidades.$inferSelect;
export type Impuesto = typeof schema.impuestos.$inferSelect;
export type Moneda = typeof schema.monedas.$inferSelect;

// Helper: numeric columns come back as strings from pg, convert to number
function num(v: string | number | null): number {
  return Number(v ?? 0);
}

function normalizeFactura(row: Factura) {
  return {
    ...row,
    id: String(row.id),
    clienteId: String(row.clienteId),
    almacenId: row.almacenId ? String(row.almacenId) : null,
    subtotal: num(row.subtotal),
    iva: num(row.iva),
    total: num(row.total),
    items: (row.items ?? []).map(i => ({
      ...i,
      precioUnitario: num(i.precioUnitario),
      subtotal: num(i.subtotal),
    })),
  };
}

function normalizePrecioNivel(v: any) {
  if (!v) return null;
  return { precio: num(v.precio), utilidad: num(v.utilidad), precioConImpuesto: num(v.precioConImpuesto) };
}

function normalizeProducto(row: Producto) {
  return {
    ...row,
    id: String(row.id),
    precio: num(row.precio),
    costo: num(row.costo),
    minimoInventario: num(row.minimoInventario),
    maximoInventario: num(row.maximoInventario),
    precioA: normalizePrecioNivel(row.precioA),
    precioB: normalizePrecioNivel(row.precioB),
    precioC: normalizePrecioNivel(row.precioC),
  };
}

function normalizeServicio(row: Servicio) {
  return {
    ...row,
    id: String(row.id),
    precio: num(row.precio),
    costo: num(row.costo),
    precioA: normalizePrecioNivel(row.precioA),
    precioB: normalizePrecioNivel(row.precioB),
    precioC: normalizePrecioNivel(row.precioC),
  };
}

function normalizeNotaCredito(row: NotaCredito) {
  return {
    ...row,
    id: String(row.id),
    facturaId: String(row.facturaId),
    clienteId: String(row.clienteId),
    almacenId: row.almacenId ? String(row.almacenId) : null,
    subtotal: num(row.subtotal),
    iva: num(row.iva),
    total: num(row.total),
    items: (row.items ?? []).map(i => ({
      ...i,
      tipo: i.tipo ?? 'producto' as const,
      precioUnitario: num(i.precioUnitario),
      subtotal: num(i.subtotal),
    })),
  };
}

function normalizeCobro(row: Cobro) {
  return { ...row, id: String(row.id), facturaId: String(row.facturaId), clienteId: String(row.clienteId), monto: num(row.monto) };
}

function normalizeCotizacion(row: Cotizacion) {
  return {
    ...row,
    id: String(row.id),
    clienteId: String(row.clienteId),
    facturaId: row.facturaId ? String(row.facturaId) : null,
    subtotal: num(row.subtotal),
    iva: num(row.iva),
    total: num(row.total),
    items: (row.items ?? []).map(i => ({
      ...i,
      tipo: (i.tipo ?? 'producto') as 'producto' | 'servicio',
      precioUnitario: num(i.precioUnitario),
      subtotal: num(i.subtotal),
    })),
  };
}

function normalizeCompra(row: Compra) {
  return {
    ...row,
    id: String(row.id),
    proveedorId: row.proveedorId ? String(row.proveedorId) : null,
    almacenId: String(row.almacenId),
    subtotal: num(row.subtotal),
    iva: num(row.iva),
    total: num(row.total),
    items: (row.items ?? []).map(i => ({
      ...i,
      precioUnitario: num(i.precioUnitario),
      subtotal: num(i.subtotal),
    })),
  };
}

function normalizeProveedor(row: Proveedor) {
  return { ...row, id: String(row.id) };
}

function normalizePagoProveedor(row: PagoProveedor) {
  return {
    ...row,
    id: String(row.id),
    compraId: String(row.compraId),
    proveedorId: row.proveedorId ? String(row.proveedorId) : null,
    monto: num(row.monto),
  };
}

function normalizePedido(row: Pedido) {
  return {
    ...row,
    id: String(row.id),
    clienteId: String(row.clienteId),
    almacenId: String(row.almacenId),
    subtotal: num(row.subtotal),
    iva: num(row.iva),
    total: num(row.total),
    items: (row.items ?? []).map(i => ({
      ...i,
      precioUnitario: num(i.precioUnitario),
      subtotal: num(i.subtotal),
    })),
  };
}

function normalizeId<T extends { id: number }>(row: T) {
  return { ...row, id: String(row.id) };
}

function normalizeComponente(row: ComponenteProducto) {
  return {
    ...row,
    id: String(row.id),
    productoId: String(row.productoId),
    componenteId: String(row.componenteId),
    unidadId: row.unidadId ? String(row.unidadId) : null,
    cantidad: num(row.cantidad),
    factorConversion: num((row as any).factorConversion ?? 1) || 1,
  };
}

function normalizeInventarioRow<T extends { id: number; stock: any; stockReservado: any }>(row: T) {
  return {
    ...row,
    id: String(row.id),
    stock: num(row.stock),
    stockReservado: num(row.stockReservado),
  };
}

function normalizeImpuesto(row: Impuesto) {
  return { ...row, id: String(row.id), porcentaje: num(row.porcentaje) };
}

function normalizeUnidad(row: Unidad) {
  return { ...row, id: String(row.id) };
}

function normalizeMoneda(row: Moneda) {
  return { ...row, id: String(row.id) };
}

function normalizeComanda(row: Comanda) {
  return {
    ...row,
    id: String(row.id),
    pedidoId: row.pedidoId ? String(row.pedidoId) : null,
    items: (row.items ?? []).map(i => ({ ...i, cantidad: num(i.cantidad) })),
  };
}

export const store = {
  // --- Usuarios ---
  async getUsuarios() {
    const rows = await db.select().from(schema.usuarios);
    return rows.map(normalizeId);
  },

  async getUsuario(id: string) {
    const rows = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, Number(id)));
    return rows[0] ? normalizeId(rows[0]) : undefined;
  },

  async getUsuarioByEmail(email: string) {
    const rows = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email));
    return rows[0] ? normalizeId(rows[0]) : undefined;
  },

  async createUsuario(data: { nombre: string; email: string; password: string; rol: string; activo: boolean }) {
    const rows = await db.insert(schema.usuarios).values(data).returning();
    return normalizeId(rows[0]);
  },

  async updateUsuario(id: string, data: Record<string, unknown>) {
    const rows = await db.update(schema.usuarios).set(data).where(eq(schema.usuarios.id, Number(id))).returning();
    return rows[0] ? normalizeId(rows[0]) : null;
  },

  async deleteUsuario(id: string) {
    const rows = await db.delete(schema.usuarios).where(eq(schema.usuarios.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Clientes ---
  async getClientes() {
    const rows = await db.select().from(schema.clientes).orderBy(schema.clientes.nombre);
    return rows.map(r => ({
      ...normalizeId(r),
      limiteCredito: num(r.limiteCredito),
      descuentoParcial: num(r.descuentoParcial),
      descuentoGlobal: num(r.descuentoGlobal),
    }));
  },

  async getCliente(id: string) {
    const rows = await db.select().from(schema.clientes).where(eq(schema.clientes.id, Number(id)));
    if (!rows[0]) return undefined;
    const r = rows[0];
    return {
      ...normalizeId(r),
      limiteCredito: num(r.limiteCredito),
      descuentoParcial: num(r.descuentoParcial),
      descuentoGlobal: num(r.descuentoGlobal),
    };
  },

  async createCliente(data: Record<string, unknown>) {
    const values: any = { ...data };
    for (const k of ['limiteCredito', 'descuentoParcial', 'descuentoGlobal']) {
      if (typeof values[k] === 'number') values[k] = String(values[k]);
    }
    const rows = await db.insert(schema.clientes).values(values).returning();
    return normalizeId(rows[0]);
  },

  async updateCliente(id: string, data: Record<string, unknown>) {
    const values: any = { ...data };
    for (const k of ['limiteCredito', 'descuentoParcial', 'descuentoGlobal']) {
      if (typeof values[k] === 'number') values[k] = String(values[k]);
    }
    const rows = await db.update(schema.clientes).set(values).where(eq(schema.clientes.id, Number(id))).returning();
    return rows[0] ? normalizeId(rows[0]) : null;
  },

  async deleteCliente(id: string) {
    const rows = await db.delete(schema.clientes).where(eq(schema.clientes.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Tipos de Cliente ---
  async getTiposCliente() { return db.select().from(schema.tiposCliente).orderBy(schema.tiposCliente.nombre); },
  async createTipoCliente(data: { nombre: string; descripcion?: string }) {
    const rows = await db.insert(schema.tiposCliente).values({ nombre: data.nombre, descripcion: data.descripcion ?? '' }).returning();
    return rows[0];
  },
  async updateTipoCliente(id: number, data: { nombre: string; descripcion?: string; activo?: boolean }) {
    const rows = await db.update(schema.tiposCliente).set(data).where(eq(schema.tiposCliente.id, id)).returning();
    return rows[0];
  },
  async deleteTipoCliente(id: number) {
    await db.delete(schema.tiposCliente).where(eq(schema.tiposCliente.id, id));
  },

  // --- Vendedores ---
  async getVendedores() { return db.select().from(schema.vendedores).orderBy(schema.vendedores.nombre); },
  async getVendedor(id: string) {
    const rows = await db.select().from(schema.vendedores).where(eq(schema.vendedores.id, Number(id)));
    return rows[0];
  },
  async createVendedor(data: { nombre: string; email?: string; telefono?: string }) {
    const rows = await db.insert(schema.vendedores).values({ nombre: data.nombre, email: data.email ?? '', telefono: data.telefono ?? '' }).returning();
    return rows[0];
  },
  async updateVendedor(id: number, data: { nombre: string; email?: string; telefono?: string; activo?: boolean }) {
    const rows = await db.update(schema.vendedores).set(data).where(eq(schema.vendedores.id, id)).returning();
    return rows[0];
  },
  async deleteVendedor(id: number) {
    await db.delete(schema.vendedores).where(eq(schema.vendedores.id, id));
  },

  // --- Catálogos auxiliares ---
  async getDepartamentos() { return db.select().from(schema.departamentos).orderBy(schema.departamentos.nombre); },
  async createDepartamento(data: { nombre: string; descripcion?: string }) {
    const rows = await db.insert(schema.departamentos).values({ nombre: data.nombre, descripcion: data.descripcion ?? '' }).returning();
    return rows[0];
  },
  async updateDepartamento(id: number, data: { nombre: string; descripcion?: string; activo?: boolean }) {
    const rows = await db.update(schema.departamentos).set(data).where(eq(schema.departamentos.id, id)).returning();
    return rows[0];
  },
  async deleteDepartamento(id: number) {
    await db.delete(schema.departamentos).where(eq(schema.departamentos.id, id));
  },

  async getGrupos() { return db.select().from(schema.grupos).orderBy(schema.grupos.nombre); },
  async createGrupo(data: { nombre: string; descripcion?: string }) {
    const rows = await db.insert(schema.grupos).values({ nombre: data.nombre, descripcion: data.descripcion ?? '' }).returning();
    return rows[0];
  },
  async updateGrupo(id: number, data: { nombre: string; descripcion?: string; activo?: boolean }) {
    const rows = await db.update(schema.grupos).set(data).where(eq(schema.grupos.id, id)).returning();
    return rows[0];
  },
  async deleteGrupo(id: number) {
    await db.delete(schema.grupos).where(eq(schema.grupos.id, id));
  },

  async getMarcas() { return db.select().from(schema.marcas).orderBy(schema.marcas.nombre); },
  async createMarca(data: { nombre: string; descripcion?: string }) {
    const rows = await db.insert(schema.marcas).values({ nombre: data.nombre, descripcion: data.descripcion ?? '' }).returning();
    return rows[0];
  },
  async updateMarca(id: number, data: { nombre: string; descripcion?: string; activo?: boolean }) {
    const rows = await db.update(schema.marcas).set(data).where(eq(schema.marcas.id, id)).returning();
    return rows[0];
  },
  async deleteMarca(id: number) {
    await db.delete(schema.marcas).where(eq(schema.marcas.id, id));
  },

  async getLineas() { return db.select().from(schema.lineas).orderBy(schema.lineas.nombre); },
  async createLinea(data: { nombre: string; descripcion?: string }) {
    const rows = await db.insert(schema.lineas).values({ nombre: data.nombre, descripcion: data.descripcion ?? '' }).returning();
    return rows[0];
  },
  async updateLinea(id: number, data: { nombre: string; descripcion?: string; activo?: boolean }) {
    const rows = await db.update(schema.lineas).set(data).where(eq(schema.lineas.id, id)).returning();
    return rows[0];
  },
  async deleteLinea(id: number) {
    await db.delete(schema.lineas).where(eq(schema.lineas.id, id));
  },

  // --- Productos ---
  async getProductos() {
    const rows = await db.select().from(schema.productos).orderBy(schema.productos.nombre);
    return rows.map(normalizeProducto);
  },

  async getProducto(id: string) {
    const rows = await db.select().from(schema.productos).where(eq(schema.productos.id, Number(id)));
    return rows[0] ? normalizeProducto(rows[0]) : undefined;
  },

  async createProducto(data: Record<string, unknown>) {
    const values: any = { ...data };
    for (const k of ['precio', 'costo', 'minimoInventario', 'maximoInventario']) {
      if (typeof values[k] === 'number') values[k] = String(values[k]);
    }
    const rows = await db.insert(schema.productos).values(values).returning();
    return normalizeProducto(rows[0]);
  },

  async updateProducto(id: string, data: Record<string, unknown>) {
    const values: any = { ...data };
    for (const k of ['precio', 'costo', 'minimoInventario', 'maximoInventario']) {
      if (typeof values[k] === 'number') values[k] = String(values[k]);
    }
    const rows = await db.update(schema.productos).set(values).where(eq(schema.productos.id, Number(id))).returning();
    return rows[0] ? normalizeProducto(rows[0]) : null;
  },

  async deleteProducto(id: string) {
    const rows = await db.delete(schema.productos).where(eq(schema.productos.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Facturas ---
  async getFacturas(sucursalId?: string) {
    const rows = sucursalId
      ? await db.select().from(schema.facturas).where(eq(schema.facturas.sucursalId, Number(sucursalId)))
      : await db.select().from(schema.facturas);
    return rows.map(normalizeFactura);
  },

  async getFactura(id: string) {
    const rows = await db.select().from(schema.facturas).where(eq(schema.facturas.id, Number(id)));
    return rows[0] ? normalizeFactura(rows[0]) : undefined;
  },

  async createFactura(data: {
    clienteId: string;
    clienteNombre: string;
    almacenId?: string;
    almacenNombre?: string;
    sucursalId?: string;
    sucursalNombre?: string;
    items: { productoId: string; productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
    subtotal: number;
    iva: number;
    total: number;
    estado: string;
    fecha: string;
    fechaVencimiento?: string;
    impuestoId?: string;
    impuestoNombre?: string;
    impuestoPorcentaje?: number;
  }) {
    const num = await _nextSecuencia('FAC');
    const numero = `FAC-${String(num).padStart(3, '0')}`;

    const rows = await db.insert(schema.facturas).values({
      numero,
      clienteId: Number(data.clienteId),
      clienteNombre: data.clienteNombre,
      almacenId: data.almacenId ? Number(data.almacenId) : null,
      almacenNombre: data.almacenNombre ?? '',
      sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
      sucursalNombre: data.sucursalNombre ?? '',
      items: data.items,
      subtotal: String(data.subtotal),
      impuestoId: data.impuestoId ? Number(data.impuestoId) : null,
      impuestoNombre: data.impuestoNombre ?? 'IVA',
      impuestoPorcentaje: String(data.impuestoPorcentaje ?? 16),
      iva: String(data.iva),
      total: String(data.total),
      estado: data.estado,
      fecha: data.fecha,
      fechaVencimiento: data.fechaVencimiento ?? null,
    }).returning();
    const factura = normalizeFactura(rows[0]);

    // If almacenId provided, create inventory exits (expandir compuestos/kits)
    if (data.almacenId && data.almacenNombre) {
      const productoItems = data.items.filter(i => (i.tipo ?? 'producto') === 'producto');
      const inventarioItems = await this._expandirItemsInventario(productoItems);
      for (const item of inventarioItems) {
        const existing = await this.getInventarioItem(data.almacenId, item.productoId);
        const stockAnterior = existing?.stock ?? 0;
        const stockNuevo = Math.max(0, stockAnterior - item.cantidad);
        await this._adjustStock(data.almacenId, data.almacenNombre, item.productoId, item.productoNombre, -item.cantidad, 0);
        await this._createMovimientoKardex({
          almacenId: data.almacenId,
          almacenNombre: data.almacenNombre,
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          tipo: 'salida',
          cantidad: item.cantidad,
          stockAnterior,
          stockNuevo,
          referencia: 'factura',
          referenciaId: Number(factura.id),
          referenciaNumero: factura.numero,
          notas: item.origenNombre
            ? `Componente de "${item.origenNombre}" — Factura ${factura.numero}`
            : `Salida por factura ${factura.numero}`,
          fecha: data.fecha,
        });
      }
    }

    return factura;
  },

  async updateFactura(id: string, data: Record<string, unknown>) {
    const values = { ...data };
    if (typeof values.subtotal === 'number') values.subtotal = String(values.subtotal);
    if (typeof values.iva === 'number') values.iva = String(values.iva);
    if (typeof values.total === 'number') values.total = String(values.total);
    const rows = await db.update(schema.facturas).set(values).where(eq(schema.facturas.id, Number(id))).returning();
    return rows[0] ? normalizeFactura(rows[0]) : null;
  },

  // --- Empresa ---
  async getEmpresa() {
    const rows = await db.select().from(schema.empresa);
    return rows[0] ?? null;
  },

  async updateEmpresa(data: Record<string, unknown>) {
    const rows = await db.select().from(schema.empresa);
    if (rows.length === 0) {
      const inserted = await db.insert(schema.empresa).values(data as typeof schema.empresa.$inferInsert).returning();
      return inserted[0];
    }
    const updated = await db.update(schema.empresa).set(data).where(eq(schema.empresa.id, rows[0].id)).returning();
    return updated[0];
  },

  // --- Roles ---
  async getRoles() {
    const rows = await db.select().from(schema.roles);
    return rows.map(r => ({ ...normalizeId(r), permisos: (r.permisos ?? []) as string[] }));
  },

  async getRol(id: string) {
    const rows = await db.select().from(schema.roles).where(eq(schema.roles.id, Number(id)));
    if (!rows[0]) return undefined;
    return { ...normalizeId(rows[0]), permisos: (rows[0].permisos ?? []) as string[] };
  },

  async createRol(data: { nombre: string; descripcion: string; permisos: string[] }) {
    const rows = await db.insert(schema.roles).values(data).returning();
    return { ...normalizeId(rows[0]), permisos: (rows[0].permisos ?? []) as string[] };
  },

  async updateRol(id: string, data: Record<string, unknown>) {
    const rows = await db.update(schema.roles).set(data).where(eq(schema.roles.id, Number(id))).returning();
    if (!rows[0]) return null;
    return { ...normalizeId(rows[0]), permisos: (rows[0].permisos ?? []) as string[] };
  },

  async deleteRol(id: string) {
    const rows = await db.delete(schema.roles).where(eq(schema.roles.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Permisos ---
  async getPermisos() {
    const rows = await db.select().from(schema.permisos);
    return rows.map(normalizeId);
  },

  async getPermiso(id: string) {
    const rows = await db.select().from(schema.permisos).where(eq(schema.permisos.id, Number(id)));
    return rows[0] ? normalizeId(rows[0]) : undefined;
  },

  async createPermiso(data: { clave: string; nombre: string; modulo: string }) {
    const rows = await db.insert(schema.permisos).values(data).returning();
    return normalizeId(rows[0]);
  },

  async updatePermiso(id: string, data: Record<string, unknown>) {
    const rows = await db.update(schema.permisos).set(data).where(eq(schema.permisos.id, Number(id))).returning();
    return rows[0] ? normalizeId(rows[0]) : null;
  },

  async deletePermiso(id: string) {
    const rows = await db.delete(schema.permisos).where(eq(schema.permisos.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Almacenes ---
  async getAlmacenes() {
    const rows = await db.select().from(schema.almacenes);
    return rows.map(normalizeId);
  },

  async getAlmacen(id: string) {
    const rows = await db.select().from(schema.almacenes).where(eq(schema.almacenes.id, Number(id)));
    return rows[0] ? normalizeId(rows[0]) : undefined;
  },

  async createAlmacen(data: { nombre: string; descripcion: string; ubicacion: string; activo: boolean }) {
    const rows = await db.insert(schema.almacenes).values(data).returning();
    return normalizeId(rows[0]);
  },

  async updateAlmacen(id: string, data: Record<string, unknown>) {
    const rows = await db.update(schema.almacenes).set(data).where(eq(schema.almacenes.id, Number(id))).returning();
    return rows[0] ? normalizeId(rows[0]) : null;
  },

  async deleteAlmacen(id: string) {
    const rows = await db.delete(schema.almacenes).where(eq(schema.almacenes.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Inventario ---
  async getInventario(almacenId?: string) {
    if (almacenId) {
      const rows = await db.select().from(schema.inventario).where(eq(schema.inventario.almacenId, Number(almacenId)));
      return rows.map(normalizeInventarioRow);
    }
    const rows = await db.select().from(schema.inventario);
    return rows.map(normalizeInventarioRow);
  },

  async getInventarioItem(almacenId: string, productoId: string) {
    const rows = await db.select().from(schema.inventario).where(
      and(
        eq(schema.inventario.almacenId, Number(almacenId)),
        eq(schema.inventario.productoId, Number(productoId))
      )
    );
    return rows[0] ? normalizeInventarioRow(rows[0]) : undefined;
  },

  // Internal helper: adjust stock (+/- delta) and reserved (+/- deltaReservado)
  async _adjustStock(almacenId: string, almacenNombre: string, productoId: string, productoNombre: string, delta: number, deltaReservado: number) {
    const existing = await this.getInventarioItem(almacenId, productoId);
    if (existing) {
      const newStock = existing.stock + delta;
      const newReservado = Math.max(0, existing.stockReservado + deltaReservado);
      await db.update(schema.inventario)
        .set({ stock: String(newStock), stockReservado: String(newReservado) })
        .where(eq(schema.inventario.id, Number(existing.id)));
      return { ...existing, stock: newStock, stockReservado: newReservado };
    } else {
      const rows = await db.insert(schema.inventario).values({
        almacenId: Number(almacenId),
        almacenNombre,
        productoId: Number(productoId),
        productoNombre,
        stock: String(Math.max(0, delta)),
        stockReservado: String(Math.max(0, deltaReservado)),
      }).returning();
      return normalizeInventarioRow(rows[0]);
    }
  },

  // Internal helper: create a kardex movement
  async _createMovimientoKardex(data: {
    almacenId: string;
    almacenNombre: string;
    productoId: string;
    productoNombre: string;
    tipo: 'entrada' | 'salida' | 'reserva' | 'liberacion';
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
    referencia: 'compra' | 'factura' | 'pedido' | 'ajuste';
    referenciaId?: number;
    referenciaNumero?: string;
    notas?: string;
    fecha: string;
  }) {
    const rows = await db.insert(schema.kardex).values({
      almacenId: Number(data.almacenId),
      almacenNombre: data.almacenNombre,
      productoId: Number(data.productoId),
      productoNombre: data.productoNombre,
      tipo: data.tipo,
      cantidad: String(data.cantidad),
      stockAnterior: String(data.stockAnterior),
      stockNuevo: String(data.stockNuevo),
      referencia: data.referencia,
      referenciaId: data.referenciaId,
      referenciaNumero: data.referenciaNumero ?? '',
      notas: data.notas ?? '',
      fecha: data.fecha,
    }).returning();
    return normalizeId(rows[0]);
  },

  // --- Kardex ---
  async getKardex(filters?: { almacenId?: string; productoId?: string }) {
    let rows;
    if (filters?.almacenId && filters?.productoId) {
      rows = await db.select().from(schema.kardex).where(
        and(
          eq(schema.kardex.almacenId, Number(filters.almacenId)),
          eq(schema.kardex.productoId, Number(filters.productoId))
        )
      ).orderBy(desc(schema.kardex.id));
    } else if (filters?.almacenId) {
      rows = await db.select().from(schema.kardex).where(
        eq(schema.kardex.almacenId, Number(filters.almacenId))
      ).orderBy(desc(schema.kardex.id));
    } else if (filters?.productoId) {
      rows = await db.select().from(schema.kardex).where(
        eq(schema.kardex.productoId, Number(filters.productoId))
      ).orderBy(desc(schema.kardex.id));
    } else {
      rows = await db.select().from(schema.kardex).orderBy(desc(schema.kardex.id));
    }
    return rows.map(r => ({
      ...r,
      id: String(r.id),
      cantidad: num(r.cantidad),
      stockAnterior: num(r.stockAnterior),
      stockNuevo: num(r.stockNuevo),
    }));
  },

  // --- Compras ---
  async getCompras(sucursalId?: string) {
    const rows = sucursalId
      ? await db.select().from(schema.compras).where(eq(schema.compras.sucursalId, Number(sucursalId))).orderBy(desc(schema.compras.id))
      : await db.select().from(schema.compras).orderBy(desc(schema.compras.id));
    return rows.map(normalizeCompra);
  },

  async getCompra(id: string) {
    const rows = await db.select().from(schema.compras).where(eq(schema.compras.id, Number(id)));
    return rows[0] ? normalizeCompra(rows[0]) : undefined;
  },

  async createCompra(data: {
    proveedorId?: string;
    proveedorNombre: string;
    almacenId: string;
    almacenNombre: string;
    sucursalId?: string;
    sucursalNombre?: string;
    items: { productoId: string; productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
    subtotal: number;
    iva: number;
    total: number;
    fecha: string;
    impuestoId?: string;
    impuestoNombre?: string;
    impuestoPorcentaje?: number;
  }) {
    const n = await _nextSecuencia('COM');
    const numero = `COM-${String(n).padStart(3, '0')}`;

    const rows = await db.insert(schema.compras).values({
      numero,
      proveedorId: data.proveedorId ? Number(data.proveedorId) : null,
      proveedorNombre: data.proveedorNombre,
      almacenId: Number(data.almacenId),
      almacenNombre: data.almacenNombre,
      sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
      sucursalNombre: data.sucursalNombre ?? '',
      items: data.items,
      subtotal: String(data.subtotal),
      impuestoId: data.impuestoId ? Number(data.impuestoId) : null,
      impuestoNombre: data.impuestoNombre ?? 'IVA',
      impuestoPorcentaje: String(data.impuestoPorcentaje ?? 16),
      iva: String(data.iva),
      total: String(data.total),
      estado: 'borrador',
      fecha: data.fecha,
    }).returning();
    return normalizeCompra(rows[0]);
  },

  async recibirCompra(id: string) {
    const compra = await this.getCompra(id);
    if (!compra || compra.estado !== 'borrador') return null;

    const fecha = new Date().toISOString().split('T')[0];

    for (const item of compra.items) {
      const existing = await this.getInventarioItem(compra.almacenId, item.productoId);
      const stockAnterior = existing?.stock ?? 0;
      const stockNuevo = stockAnterior + item.cantidad;

      await this._adjustStock(compra.almacenId, compra.almacenNombre, item.productoId, item.productoNombre, item.cantidad, 0);
      await this._createMovimientoKardex({
        almacenId: compra.almacenId,
        almacenNombre: compra.almacenNombre,
        productoId: item.productoId,
        productoNombre: item.productoNombre,
        tipo: 'entrada',
        cantidad: item.cantidad,
        stockAnterior,
        stockNuevo,
        referencia: 'compra',
        referenciaId: Number(compra.id),
        referenciaNumero: compra.numero,
        notas: `Recepción de compra ${compra.numero}`,
        fecha,
      });
    }

    const rows = await db.update(schema.compras).set({ estado: 'recibida' }).where(eq(schema.compras.id, Number(id))).returning();
    return rows[0] ? normalizeCompra(rows[0]) : null;
  },

  async cancelarCompra(id: string) {
    const rows = await db.update(schema.compras).set({ estado: 'cancelada' }).where(eq(schema.compras.id, Number(id))).returning();
    return rows[0] ? normalizeCompra(rows[0]) : null;
  },

  // --- Proveedores ---
  async getProveedores() {
    const rows = await db.select().from(schema.proveedores).orderBy(schema.proveedores.nombre);
    return rows.map(normalizeProveedor);
  },

  async getProveedor(id: string) {
    const rows = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, Number(id)));
    return rows[0] ? normalizeProveedor(rows[0]) : undefined;
  },

  async createProveedor(data: { nombre: string; rfc?: string; contacto?: string; telefono?: string; email?: string; direccion?: string; notas?: string; activo?: boolean }) {
    const rows = await db.insert(schema.proveedores).values({
      nombre: data.nombre,
      rfc: data.rfc ?? '',
      contacto: data.contacto ?? '',
      telefono: data.telefono ?? '',
      email: data.email ?? '',
      direccion: data.direccion ?? '',
      notas: data.notas ?? '',
      activo: data.activo ?? true,
    }).returning();
    return normalizeProveedor(rows[0]);
  },

  async updateProveedor(id: string, data: Record<string, unknown>) {
    const rows = await db.update(schema.proveedores).set(data).where(eq(schema.proveedores.id, Number(id))).returning();
    return rows[0] ? normalizeProveedor(rows[0]) : null;
  },

  async deleteProveedor(id: string) {
    await db.delete(schema.proveedores).where(eq(schema.proveedores.id, Number(id)));
  },

  // --- Pagos a Proveedores (Cuentas por Pagar) ---
  async getPagosProveedor(compraId?: string) {
    if (compraId) {
      const rows = await db.select().from(schema.pagosProveedor)
        .where(eq(schema.pagosProveedor.compraId, Number(compraId)))
        .orderBy(desc(schema.pagosProveedor.id));
      return rows.map(normalizePagoProveedor);
    }
    const rows = await db.select().from(schema.pagosProveedor).orderBy(desc(schema.pagosProveedor.id));
    return rows.map(normalizePagoProveedor);
  },

  async createPagoProveedor(data: {
    compraId: string;
    compraNumero: string;
    proveedorId?: string;
    proveedorNombre: string;
    sucursalId?: string;
    sucursalNombre?: string;
    monto: number;
    fecha: string;
    metodoPago: string;
    referencia?: string;
    cuentaBancaria?: string;
    notas?: string;
  }) {
    const n = await _nextSecuencia('PAP');
    const numero = `PAP-${String(n).padStart(3, '0')}`;
    const rows = await db.insert(schema.pagosProveedor).values({
      numero,
      compraId: Number(data.compraId),
      compraNumero: data.compraNumero,
      proveedorId: data.proveedorId ? Number(data.proveedorId) : null,
      proveedorNombre: data.proveedorNombre,
      sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
      sucursalNombre: data.sucursalNombre ?? '',
      monto: String(data.monto),
      fecha: data.fecha,
      metodoPago: data.metodoPago,
      referencia: data.referencia ?? '',
      cuentaBancaria: data.cuentaBancaria ?? '',
      notas: data.notas ?? '',
      estado: 'aplicado',
    }).returning();
    return normalizePagoProveedor(rows[0]);
  },

  async cancelarPagoProveedor(id: string) {
    const rows = await db.update(schema.pagosProveedor)
      .set({ estado: 'cancelado' })
      .where(eq(schema.pagosProveedor.id, Number(id)))
      .returning();
    return rows[0] ? normalizePagoProveedor(rows[0]) : null;
  },

  // Saldo pendiente de una compra (similar a getSaldoFactura)
  async getSaldoCompra(compraId: string) {
    const compra = await this.getCompra(compraId);
    if (!compra) return null;
    const pagos = await db.select().from(schema.pagosProveedor).where(
      and(eq(schema.pagosProveedor.compraId, Number(compraId)), eq(schema.pagosProveedor.estado, 'aplicado'))
    );
    const totalPagado = pagos.reduce((s, p) => s + num(p.monto), 0);
    const saldo = Math.max(0, compra.total - totalPagado);
    let estadoPago: 'pendiente' | 'parcial' | 'pagada' = 'pendiente';
    if (saldo === 0) estadoPago = 'pagada';
    else if (totalPagado > 0) estadoPago = 'parcial';
    return { compra, totalPagado, saldo, estadoPago };
  },

  // --- Cuentas por Pagar ---
  async getCuentasPorPagar() {
    const todasCompras = await db.select().from(schema.compras).orderBy(desc(schema.compras.id));
    const compras = todasCompras.map(normalizeCompra).filter(c => c.estado === 'recibida');

    const result = await Promise.all(compras.map(async (c) => {
      const pagos = await db.select().from(schema.pagosProveedor).where(
        and(eq(schema.pagosProveedor.compraId, Number(c.id)), eq(schema.pagosProveedor.estado, 'aplicado'))
      );
      const totalPagado = pagos.reduce((s, p) => s + num(p.monto), 0);
      const saldo = Math.max(0, c.total - totalPagado);
      let estadoPago: 'pendiente' | 'parcial' | 'pagada' = 'pendiente';
      if (saldo === 0) estadoPago = 'pagada';
      else if (totalPagado > 0) estadoPago = 'parcial';
      return { ...c, totalPagado, saldo, estadoPago };
    }));

    return result;
  },

  // --- Pedidos ---
  async getPedidos(sucursalId?: string) {
    const rows = sucursalId
      ? await db.select().from(schema.pedidos).where(eq(schema.pedidos.sucursalId, Number(sucursalId))).orderBy(desc(schema.pedidos.id))
      : await db.select().from(schema.pedidos).orderBy(desc(schema.pedidos.id));
    return rows.map(normalizePedido);
  },

  async getPedido(id: string) {
    const rows = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, Number(id)));
    return rows[0] ? normalizePedido(rows[0]) : undefined;
  },

  async createPedido(data: {
    clienteId: string;
    clienteNombre: string;
    almacenId: string;
    almacenNombre: string;
    sucursalId?: string;
    sucursalNombre?: string;
    items: { productoId: string; productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
    subtotal: number;
    iva: number;
    total: number;
    notas: string;
    fecha: string;
    impuestoId?: string;
    impuestoNombre?: string;
    impuestoPorcentaje?: number;
  }) {
    const n = await _nextSecuencia('PED');
    const numero = `PED-${String(n).padStart(3, '0')}`;

    const rows = await db.insert(schema.pedidos).values({
      numero,
      clienteId: Number(data.clienteId),
      clienteNombre: data.clienteNombre,
      almacenId: Number(data.almacenId),
      almacenNombre: data.almacenNombre,
      sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
      sucursalNombre: data.sucursalNombre ?? '',
      items: data.items,
      subtotal: String(data.subtotal),
      impuestoId: data.impuestoId ? Number(data.impuestoId) : null,
      impuestoNombre: data.impuestoNombre ?? 'IVA',
      impuestoPorcentaje: String(data.impuestoPorcentaje ?? 16),
      iva: String(data.iva),
      total: String(data.total),
      estado: 'borrador',
      notas: data.notas,
      fecha: data.fecha,
    }).returning();
    return normalizePedido(rows[0]);
  },

  async confirmarPedido(id: string) {
    const pedido = await this.getPedido(id);
    if (!pedido || pedido.estado !== 'borrador') {
      return { ok: false, error: 'El pedido no está en estado borrador.' };
    }

    const fecha = new Date().toISOString().split('T')[0];

    // Expandir items compuestos/kit → sus componentes para validar y reservar stock
    const inventarioItems = await this._expandirItemsInventario(pedido.items);

    // Validate stock disponible for all (expanded) items before making any changes
    for (const item of inventarioItems) {
      const inv = await this.getInventarioItem(pedido.almacenId, item.productoId);
      const disponible = (inv?.stock ?? 0) - (inv?.stockReservado ?? 0);
      if (disponible < item.cantidad) {
        return { ok: false, error: `Stock insuficiente para "${item.productoNombre}"${item.origenNombre ? ` (componente de "${item.origenNombre}")` : ''}. Disponible: ${disponible}, requerido: ${item.cantidad}.` };
      }
    }

    // Reserve inventory (sobre componentes expandidos)
    for (const item of inventarioItems) {
      const inv = await this.getInventarioItem(pedido.almacenId, item.productoId);
      const stockDisponibleAnterior = (inv?.stock ?? 0) - (inv?.stockReservado ?? 0);
      const stockDisponibleNuevo = stockDisponibleAnterior - item.cantidad;

      await this._adjustStock(pedido.almacenId, pedido.almacenNombre, item.productoId, item.productoNombre, 0, item.cantidad);
      await this._createMovimientoKardex({
        almacenId: pedido.almacenId,
        almacenNombre: pedido.almacenNombre,
        productoId: item.productoId,
        productoNombre: item.productoNombre,
        tipo: 'reserva',
        cantidad: item.cantidad,
        stockAnterior: stockDisponibleAnterior,
        stockNuevo: stockDisponibleNuevo,
        referencia: 'pedido',
        referenciaId: Number(pedido.id),
        referenciaNumero: pedido.numero,
        notas: item.origenNombre
          ? `Reserva componente de "${item.origenNombre}" por pedido ${pedido.numero}`
          : `Reserva por pedido ${pedido.numero}`,
        fecha,
      });
    }

    const rows = await db.update(schema.pedidos).set({ estado: 'confirmado' }).where(eq(schema.pedidos.id, Number(id))).returning();
    return { ok: true, pedido: rows[0] ? normalizePedido(rows[0]) : null };
  },

  async cancelarPedido(id: string) {
    const pedido = await this.getPedido(id);
    if (!pedido) return null;

    const fecha = new Date().toISOString().split('T')[0];

    // If confirmed, release reservations (sobre componentes expandidos)
    if (pedido.estado === 'confirmado') {
      const inventarioItems = await this._expandirItemsInventario(pedido.items);
      for (const item of inventarioItems) {
        const inv = await this.getInventarioItem(pedido.almacenId, item.productoId);
        const stockDisponibleAnterior = (inv?.stock ?? 0) - (inv?.stockReservado ?? 0);
        const stockDisponibleNuevo = stockDisponibleAnterior + item.cantidad;

        await this._adjustStock(pedido.almacenId, pedido.almacenNombre, item.productoId, item.productoNombre, 0, -item.cantidad);
        await this._createMovimientoKardex({
          almacenId: pedido.almacenId,
          almacenNombre: pedido.almacenNombre,
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          tipo: 'liberacion',
          cantidad: item.cantidad,
          stockAnterior: stockDisponibleAnterior,
          stockNuevo: stockDisponibleNuevo,
          referencia: 'pedido',
          referenciaId: Number(pedido.id),
          referenciaNumero: pedido.numero,
          notas: item.origenNombre
            ? `Liberación componente de "${item.origenNombre}" por cancelación de pedido ${pedido.numero}`
            : `Liberación por cancelación de pedido ${pedido.numero}`,
          fecha,
        });
      }
    }

    const rows = await db.update(schema.pedidos).set({ estado: 'cancelado' }).where(eq(schema.pedidos.id, Number(id))).returning();
    return rows[0] ? normalizePedido(rows[0]) : null;
  },

  // --- Servicios ---
  async getServicios() {
    const rows = await db.select().from(schema.servicios);
    return rows.map(normalizeServicio);
  },

  async getServicio(id: string) {
    const rows = await db.select().from(schema.servicios).where(eq(schema.servicios.id, Number(id)));
    return rows[0] ? normalizeServicio(rows[0]) : undefined;
  },

  async createServicio(data: Record<string, unknown>) {
    const values: any = { ...data };
    for (const k of ['precio', 'costo']) {
      if (typeof values[k] === 'number') values[k] = String(values[k]);
    }
    const rows = await db.insert(schema.servicios).values(values).returning();
    return normalizeServicio(rows[0]);
  },

  async updateServicio(id: string, data: Record<string, unknown>) {
    const values: any = { ...data };
    for (const k of ['precio', 'costo']) {
      if (typeof values[k] === 'number') values[k] = String(values[k]);
    }
    const rows = await db.update(schema.servicios).set(values).where(eq(schema.servicios.id, Number(id))).returning();
    return rows[0] ? normalizeServicio(rows[0]) : null;
  },

  async deleteServicio(id: string) {
    const rows = await db.delete(schema.servicios).where(eq(schema.servicios.id, Number(id))).returning();
    return rows.length > 0;
  },

  // --- Notas de Crédito ---
  async getNotasCredito(sucursalId?: string) {
    const rows = sucursalId
      ? await db.select().from(schema.notasCredito).where(eq(schema.notasCredito.sucursalId, Number(sucursalId))).orderBy(desc(schema.notasCredito.id))
      : await db.select().from(schema.notasCredito).orderBy(desc(schema.notasCredito.id));
    return rows.map(normalizeNotaCredito);
  },

  async getNotaCredito(id: string) {
    const rows = await db.select().from(schema.notasCredito).where(eq(schema.notasCredito.id, Number(id)));
    return rows[0] ? normalizeNotaCredito(rows[0]) : undefined;
  },

  async getNotaCreditoByFactura(facturaId: string) {
    const rows = await db.select().from(schema.notasCredito).where(eq(schema.notasCredito.facturaId, Number(facturaId)));
    return rows[0] ? normalizeNotaCredito(rows[0]) : undefined;
  },

  async createNotaCredito(facturaId: string, motivo: string) {
    const factura = await this.getFactura(facturaId);
    if (!factura || factura.estado === 'cancelada') return null;

    const n = await _nextSecuencia('NC');
    const numero = `NC-${String(n).padStart(3, '0')}`;
    const fecha = new Date().toISOString().split('T')[0];

    const rows = await db.insert(schema.notasCredito).values({
      numero,
      facturaId: Number(facturaId),
      facturaNumero: factura.numero,
      clienteId: Number(factura.clienteId),
      clienteNombre: factura.clienteNombre,
      almacenId: factura.almacenId ? Number(factura.almacenId) : null,
      almacenNombre: factura.almacenNombre ?? '',
      sucursalId: (factura as any).sucursalId ? Number((factura as any).sucursalId) : null,
      sucursalNombre: (factura as any).sucursalNombre ?? '',
      items: factura.items as typeof schema.notasCredito.$inferInsert['items'],
      subtotal: String(factura.subtotal),
      iva: String(factura.iva),
      total: String(factura.total),
      motivo,
      fecha,
    }).returning();
    const nota = normalizeNotaCredito(rows[0]);

    // Cancel the factura
    await db.update(schema.facturas).set({ estado: 'cancelada' }).where(eq(schema.facturas.id, Number(facturaId)));

    // Return inventory for tipo='producto' items that had a warehouse
    if (factura.almacenId && factura.almacenNombre) {
      for (const item of factura.items) {
        if ((item.tipo ?? 'producto') !== 'producto') continue;
        const existing = await this.getInventarioItem(factura.almacenId, item.productoId);
        const stockAnterior = existing?.stock ?? 0;
        const stockNuevo = stockAnterior + item.cantidad;
        await this._adjustStock(factura.almacenId, factura.almacenNombre, item.productoId, item.productoNombre, item.cantidad, 0);
        await this._createMovimientoKardex({
          almacenId: factura.almacenId,
          almacenNombre: factura.almacenNombre,
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          tipo: 'entrada',
          cantidad: item.cantidad,
          stockAnterior,
          stockNuevo,
          referencia: 'ajuste',
          referenciaId: Number(nota.id),
          referenciaNumero: nota.numero,
          notas: `Devolución por nota de crédito ${nota.numero}`,
          fecha,
        });
      }
    }

    return nota;
  },

  // --- Cobros ---
  async getCobros(facturaId?: string, sucursalId?: string) {
    if (facturaId) {
      const rows = await db.select().from(schema.cobros)
        .where(eq(schema.cobros.facturaId, Number(facturaId)))
        .orderBy(desc(schema.cobros.id));
      return rows.map(normalizeCobro);
    }
    const rows = sucursalId
      ? await db.select().from(schema.cobros).where(eq(schema.cobros.sucursalId, Number(sucursalId))).orderBy(desc(schema.cobros.id))
      : await db.select().from(schema.cobros).orderBy(desc(schema.cobros.id));
    return rows.map(normalizeCobro);
  },

  async getCobro(id: string) {
    const rows = await db.select().from(schema.cobros).where(eq(schema.cobros.id, Number(id)));
    return rows[0] ? normalizeCobro(rows[0]) : undefined;
  },

  async getCobrosCliente(clienteId: string) {
    const rows = await db.select().from(schema.cobros)
      .where(eq(schema.cobros.clienteId, Number(clienteId)))
      .orderBy(desc(schema.cobros.id));
    return rows.map(normalizeCobro);
  },

  // Computes total cobrado and saldo pendiente for a factura
  async getSaldoFactura(facturaId: string) {
    const factura = await this.getFactura(facturaId);
    if (!factura) return null;
    const cobrosRows = await db.select().from(schema.cobros).where(
      and(eq(schema.cobros.facturaId, Number(facturaId)), eq(schema.cobros.estado, 'aplicado'))
    );
    const cobrado = cobrosRows.reduce((sum, c) => sum + num(c.monto), 0);
    const saldo = Math.max(0, factura.total - cobrado);
    return { total: factura.total, cobrado, saldo };
  },

  // Internal: recalculate and update factura estado based on cobros
  async _recalcularEstadoFactura(facturaId: string) {
    const factura = await this.getFactura(facturaId);
    if (!factura || factura.estado === 'cancelada') return;
    const cobrosRows = await db.select().from(schema.cobros).where(
      and(eq(schema.cobros.facturaId, Number(facturaId)), eq(schema.cobros.estado, 'aplicado'))
    );
    const cobrado = cobrosRows.reduce((sum, c) => sum + num(c.monto), 0);
    const saldo = Math.max(0, factura.total - cobrado);
    const today = new Date().toISOString().split('T')[0];

    let nuevoEstado: string;
    if (saldo === 0) {
      nuevoEstado = 'pagada';
    } else if (cobrado > 0) {
      nuevoEstado = 'parcial';
    } else if (factura.fechaVencimiento && factura.fechaVencimiento < today) {
      nuevoEstado = 'vencida';
    } else {
      nuevoEstado = 'pendiente';
    }
    await db.update(schema.facturas).set({ estado: nuevoEstado }).where(eq(schema.facturas.id, Number(facturaId)));
  },

  async createCobro(data: {
    facturaId: string;
    monto: number;
    metodoPago: string;
    referencia?: string;
    notas?: string;
    fecha: string;
  }) {
    const factura = await this.getFactura(data.facturaId);
    if (!factura || factura.estado === 'cancelada' || factura.estado === 'pagada') {
      return { ok: false, error: 'La factura no admite cobros.' };
    }
    const saldoInfo = await this.getSaldoFactura(data.facturaId);
    if (!saldoInfo || data.monto <= 0 || data.monto > saldoInfo.saldo + 0.001) {
      return { ok: false, error: `Monto inválido. Saldo pendiente: ${saldoInfo?.saldo?.toFixed(2) ?? 0}` };
    }

    const n = await _nextSecuencia('COB');
    const numero = `COB-${String(n).padStart(3, '0')}`;

    const rows = await db.insert(schema.cobros).values({
      numero,
      facturaId: Number(data.facturaId),
      facturaNumero: factura.numero,
      clienteId: Number(factura.clienteId),
      clienteNombre: factura.clienteNombre,
      sucursalId: (factura as any).sucursalId ? Number((factura as any).sucursalId) : null,
      sucursalNombre: (factura as any).sucursalNombre ?? '',
      monto: String(data.monto),
      fecha: data.fecha,
      metodoPago: data.metodoPago,
      referencia: data.referencia ?? '',
      notas: data.notas ?? '',
      estado: 'aplicado',
    }).returning();

    await this._recalcularEstadoFactura(data.facturaId);
    return { ok: true, cobro: normalizeCobro(rows[0]) };
  },

  async anularCobro(id: string) {
    const cobro = await this.getCobro(id);
    if (!cobro || cobro.estado === 'anulado') return { ok: false, error: 'Cobro ya anulado.' };
    await db.update(schema.cobros).set({ estado: 'anulado' }).where(eq(schema.cobros.id, Number(id)));
    await this._recalcularEstadoFactura(cobro.facturaId);
    return { ok: true };
  },

  // --- Cuentas por Cobrar ---
  async getCuentasPorCobrar() {
    // All facturas not pagada/cancelada
    const todasFacturas = await db.select().from(schema.facturas);
    const pendientes = todasFacturas
      .map(normalizeFactura)
      .filter(f => f.estado !== 'pagada' && f.estado !== 'cancelada');

    const today = new Date().toISOString().split('T')[0];

    const result = await Promise.all(pendientes.map(async (f) => {
      const cobrosRows = await db.select().from(schema.cobros).where(
        and(eq(schema.cobros.facturaId, Number(f.id)), eq(schema.cobros.estado, 'aplicado'))
      );
      const cobrado = cobrosRows.reduce((sum, c) => sum + num(c.monto), 0);
      const saldo = Math.max(0, f.total - cobrado);

      let diasVencido = 0;
      if (f.fechaVencimiento && f.fechaVencimiento < today) {
        const ms = new Date(today).getTime() - new Date(f.fechaVencimiento).getTime();
        diasVencido = Math.floor(ms / 86400000);
      }

      return { ...f, cobrado, saldo, diasVencido };
    }));

    return result.sort((a, b) => b.diasVencido - a.diasVencido);
  },

  async despacharPedido(id: string) {
    const pedido = await this.getPedido(id);
    if (!pedido || pedido.estado !== 'confirmado') return null;

    const fecha = new Date().toISOString().split('T')[0];

    // Create actual stock exits (salidas) and release reservations
    // Para productos compuestos/kit se descuenta de sus componentes
    const inventarioItems = await this._expandirItemsInventario(pedido.items);
    for (const item of inventarioItems) {
      const inv = await this.getInventarioItem(pedido.almacenId, item.productoId);
      const stockAnterior = inv?.stock ?? 0;
      const stockNuevo = Math.max(0, stockAnterior - item.cantidad);

      // Decrease stock and release reservation simultaneously
      await this._adjustStock(pedido.almacenId, pedido.almacenNombre, item.productoId, item.productoNombre, -item.cantidad, -item.cantidad);
      await this._createMovimientoKardex({
        almacenId: pedido.almacenId,
        almacenNombre: pedido.almacenNombre,
        productoId: item.productoId,
        productoNombre: item.productoNombre,
        tipo: 'salida',
        cantidad: item.cantidad,
        stockAnterior,
        stockNuevo,
        referencia: 'pedido',
        referenciaId: Number(pedido.id),
        referenciaNumero: pedido.numero,
        notas: item.origenNombre
          ? `Componente de "${item.origenNombre}" — Despacho de pedido ${pedido.numero}`
          : `Despacho de pedido ${pedido.numero}`,
        fecha,
      });
    }

    const rows = await db.update(schema.pedidos).set({ estado: 'despachado' }).where(eq(schema.pedidos.id, Number(id))).returning();
    return rows[0] ? normalizePedido(rows[0]) : null;
  },

  // --- Cotizaciones ---
  async getCotizaciones(sucursalId?: string) {
    const rows = sucursalId
      ? await db.select().from(schema.cotizaciones).where(eq(schema.cotizaciones.sucursalId, Number(sucursalId))).orderBy(desc(schema.cotizaciones.id))
      : await db.select().from(schema.cotizaciones).orderBy(desc(schema.cotizaciones.id));
    return rows.map(normalizeCotizacion);
  },

  async getCotizacion(id: string) {
    const rows = await db.select().from(schema.cotizaciones).where(eq(schema.cotizaciones.id, Number(id)));
    return rows[0] ? normalizeCotizacion(rows[0]) : undefined;
  },

  async getCotizacionesCliente(clienteId: string) {
    const rows = await db.select().from(schema.cotizaciones)
      .where(eq(schema.cotizaciones.clienteId, Number(clienteId)))
      .orderBy(desc(schema.cotizaciones.id));
    return rows.map(normalizeCotizacion);
  },

  async createCotizacion(data: {
    clienteId: string;
    clienteNombre: string;
    sucursalId?: string;
    sucursalNombre?: string;
    items: { tipo: 'producto' | 'servicio'; productoId: string; productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
    subtotal: number;
    iva: number;
    total: number;
    notas?: string;
    fechaVencimiento?: string;
    fecha: string;
    impuestoId?: string;
    impuestoNombre?: string;
    impuestoPorcentaje?: number;
  }) {
    const n = await _nextSecuencia('COT');
    const numero = `COT-${String(n).padStart(3, '0')}`;

    const rows = await db.insert(schema.cotizaciones).values({
      numero,
      clienteId: Number(data.clienteId),
      clienteNombre: data.clienteNombre,
      sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
      sucursalNombre: data.sucursalNombre ?? '',
      items: data.items,
      subtotal: String(data.subtotal),
      impuestoId: data.impuestoId ? Number(data.impuestoId) : null,
      impuestoNombre: data.impuestoNombre ?? 'IVA',
      impuestoPorcentaje: String(data.impuestoPorcentaje ?? 16),
      iva: String(data.iva),
      total: String(data.total),
      estado: 'borrador',
      notas: data.notas ?? '',
      fechaVencimiento: data.fechaVencimiento ?? null,
      fecha: data.fecha,
    }).returning();
    return normalizeCotizacion(rows[0]);
  },

  async updateCotizacionEstado(id: string, estado: string) {
    const rows = await db.update(schema.cotizaciones)
      .set({ estado })
      .where(eq(schema.cotizaciones.id, Number(id)))
      .returning();
    return rows[0] ? normalizeCotizacion(rows[0]) : null;
  },

  // Convert a cotizacion to a factura (almacen optional, applies inventory rules)
  async convertirCotizacionAFactura(cotizacionId: string, almacenId?: string) {
    const cot = await this.getCotizacion(cotizacionId);
    if (!cot || cot.estado === 'convertida' || cot.estado === 'rechazada') return null;

    let almacenNombre = '';
    if (almacenId) {
      const alm = await this.getAlmacen(almacenId);
      almacenNombre = alm?.nombre ?? '';
    }

    const factura = await this.createFactura({
      clienteId: cot.clienteId,
      clienteNombre: cot.clienteNombre,
      almacenId: almacenId ?? undefined,
      almacenNombre: almacenNombre || undefined,
      items: cot.items,
      subtotal: cot.subtotal,
      iva: cot.iva,
      total: cot.total,
      estado: 'pendiente',
      fecha: new Date().toISOString().split('T')[0],
    });

    await db.update(schema.cotizaciones)
      .set({ estado: 'convertida', facturaId: Number(factura.id), facturaNumero: factura.numero })
      .where(eq(schema.cotizaciones.id, Number(cotizacionId)));

    return factura;
  },

  // --- Reportes ---
  async getReporteVentas(mes: number, año: number) {
    const prefix = `${año}-${String(mes).padStart(2, '0')}`;

    const [rawFacturas, rawCobros] = await Promise.all([
      db.select().from(schema.facturas).where(sql`${schema.facturas.fecha}::text LIKE ${prefix + '%'}`),
      db.select().from(schema.cobros).where(sql`${schema.cobros.fecha}::text LIKE ${prefix + '%'}`),
    ]);

    const facturas = rawFacturas.map(normalizeFactura);
    const cobros = rawCobros.map(normalizeCobro);

    const facturasActivas = facturas.filter(f => f.estado !== 'cancelada');
    const cobrosAplicados = cobros.filter(c => c.estado === 'aplicado');

    const totalFacturado = facturasActivas.reduce((s, f) => s + f.total, 0);
    const totalCobrado = cobrosAplicados.reduce((s, c) => s + c.monto, 0);
    const saldoPendiente = Math.max(0, totalFacturado - totalCobrado);

    // Count by estado
    const porEstado: Record<string, number> = {};
    for (const f of facturas) {
      porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
    }

    // Top clientes by revenue
    const porCliente = new Map<string, { nombre: string; total: number; count: number }>();
    for (const f of facturasActivas) {
      const prev = porCliente.get(f.clienteId);
      if (prev) { prev.total += f.total; prev.count++; }
      else porCliente.set(f.clienteId, { nombre: f.clienteNombre, total: f.total, count: 1 });
    }
    const topClientes = [...porCliente.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    // Top productos/servicios from items
    const porProducto = new Map<string, { nombre: string; tipo: string; cantidad: number; total: number }>();
    for (const f of facturasActivas) {
      for (const item of f.items) {
        const key = `${item.tipo ?? 'producto'}:${item.productoId}`;
        const prev = porProducto.get(key);
        if (prev) { prev.cantidad += item.cantidad; prev.total += item.subtotal; }
        else porProducto.set(key, { nombre: item.productoNombre, tipo: item.tipo ?? 'producto', cantidad: item.cantidad, total: item.subtotal });
      }
    }
    const topProductos = [...porProducto.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    // Cobros por método de pago
    const porMetodo = new Map<string, number>();
    for (const c of cobrosAplicados) {
      porMetodo.set(c.metodoPago, (porMetodo.get(c.metodoPago) ?? 0) + c.monto);
    }

    return {
      mes, año, prefix,
      facturas,
      cobros: cobrosAplicados,
      totalFacturado,
      totalCobrado,
      saldoPendiente,
      porEstado,
      topClientes,
      topProductos,
      porMetodo: Object.fromEntries(porMetodo),
    };
  },

  // ── Inventario Compuesto: helper que expande items a sus componentes ──────
  // Para compuesto/kit: reemplaza el item por sus componentes × cantidad vendida × factorConversion
  // factorConversion convierte la unidad de la receta a la unidad del inventario
  //   Ej: receta dice 100 g, inventario lleva kg → factor = 0.001 → descuenta 0.1
  // Para simple: devuelve el item sin cambios
  async _expandirItemsInventario(
    items: { productoId: string; productoNombre: string; cantidad: number }[]
  ): Promise<{ productoId: string; productoNombre: string; cantidad: number; origenNombre: string | null }[]> {
    const resultado: { productoId: string; productoNombre: string; cantidad: number; origenNombre: string | null }[] = [];
    for (const item of items) {
      const producto = await this.getProducto(item.productoId);
      if (producto && (producto.tipoProducto === 'compuesto' || producto.tipoProducto === 'kit')) {
        const componentes = await this.getComponentesProducto(item.productoId);
        for (const comp of componentes) {
          const factor = comp.factorConversion || 1;
          resultado.push({
            productoId: comp.componenteId,
            productoNombre: comp.componenteNombre,
            // cantidad en unidades del inventario = cantidad_receta × factor × veces vendidas
            cantidad: comp.cantidad * factor * item.cantidad,
            origenNombre: item.productoNombre,
          });
        }
      } else {
        resultado.push({ ...item, origenNombre: null });
      }
    }
    return resultado;
  },

  // ── Componentes de Producto ───────────────────────────────────────────────
  async getComponentesProducto(productoId: string) {
    const rows = await db.select().from(schema.componentesProducto)
      .where(eq(schema.componentesProducto.productoId, Number(productoId)));
    return rows.map(normalizeComponente);
  },

  async setComponentesProducto(
    productoId: string,
    componentes: { componenteId: string; componenteNombre: string; cantidad: number; factorConversion?: number; unidad?: string; unidadId?: string }[]
  ) {
    // Reemplazar todos los componentes del producto
    await db.delete(schema.componentesProducto)
      .where(eq(schema.componentesProducto.productoId, Number(productoId)));
    if (componentes.length === 0) return [];
    const rows = await db.insert(schema.componentesProducto).values(
      componentes.map(c => ({
        productoId: Number(productoId),
        componenteId: Number(c.componenteId),
        componenteNombre: c.componenteNombre,
        cantidad: String(c.cantidad),
        factorConversion: String(c.factorConversion ?? 1),
        unidadId: c.unidadId ? Number(c.unidadId) : null,
        unidad: c.unidad ?? '',
      }))
    ).returning();
    return rows.map(normalizeComponente);
  },

  async deleteComponentesProducto(productoId: string) {
    await db.delete(schema.componentesProducto)
      .where(eq(schema.componentesProducto.productoId, Number(productoId)));
  },

  // ── Comandas (órdenes de cocina) ──────────────────────────────────────────
  async getComandasActivas(sucursalId?: string) {
    const baseWhere = sql`${schema.comandas.estado} NOT IN ('entregada', 'cancelada')`;
    const rows = sucursalId
      ? await db.select().from(schema.comandas)
          .where(and(baseWhere, eq(schema.comandas.sucursalId, Number(sucursalId))))
          .orderBy(schema.comandas.creadoAt)
      : await db.select().from(schema.comandas)
          .where(baseWhere)
          .orderBy(schema.comandas.creadoAt);
    return rows.map(normalizeComanda);
  },

  async getComandasAll() {
    const rows = await db.select().from(schema.comandas)
      .orderBy(desc(schema.comandas.id));
    return rows.map(normalizeComanda);
  },

  async getComanda(id: string) {
    const rows = await db.select().from(schema.comandas).where(eq(schema.comandas.id, Number(id)));
    return rows[0] ? normalizeComanda(rows[0]) : undefined;
  },

  async crearComanda(data: {
    pedidoId?: string;
    pedidoNumero?: string;
    sucursalId?: string;
    sucursalNombre?: string;
    mesa?: string;
    clienteNombre?: string;
    items: { productoId: string; productoNombre: string; cantidad: number; notas?: string }[];
    prioridad?: string;
    notas?: string;
  }) {
    const n = await _nextSecuencia('CMD');
    const numero = `CMD-${String(n).padStart(4, '0')}`;
    const fecha = new Date().toISOString().split('T')[0];

    const rows = await db.insert(schema.comandas).values({
      numero,
      pedidoId: data.pedidoId ? Number(data.pedidoId) : null,
      pedidoNumero: data.pedidoNumero ?? '',
      sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
      sucursalNombre: data.sucursalNombre ?? '',
      mesa: data.mesa ?? '',
      clienteNombre: data.clienteNombre ?? '',
      items: data.items.map(i => ({ ...i, notas: i.notas ?? '' })),
      estado: 'nueva',
      prioridad: data.prioridad ?? 'normal',
      notas: data.notas ?? '',
      fecha,
    }).returning();
    return normalizeComanda(rows[0]);
  },

  async crearComandaDesdePedido(pedidoId: string) {
    const pedido = await this.getPedido(pedidoId);
    if (!pedido) return null;
    return this.crearComanda({
      pedidoId,
      pedidoNumero: pedido.numero,
      clienteNombre: pedido.clienteNombre,
      items: pedido.items.map(i => ({
        productoId: i.productoId,
        productoNombre: i.productoNombre,
        cantidad: i.cantidad,
        notas: '',
      })),
    });
  },

  async actualizarEstadoComanda(id: string, estado: string) {
    const ahora = new Date();
    const update: Record<string, unknown> = { estado };
    if (estado === 'en_preparacion') update.iniciadoAt = ahora;
    if (estado === 'lista')          update.listoAt    = ahora;
    if (estado === 'entregada')      update.entregadoAt = ahora;

    const rows = await db.update(schema.comandas).set(update).where(eq(schema.comandas.id, Number(id))).returning();
    return rows[0] ? normalizeComanda(rows[0]) : null;
  },

  async cancelarComanda(id: string) {
    const rows = await db.update(schema.comandas).set({ estado: 'cancelada' })
      .where(eq(schema.comandas.id, Number(id))).returning();
    return rows[0] ? normalizeComanda(rows[0]) : null;
  },

  // Last N months summary for chart/comparison
  async getResumenMensual(meses = 6) {
    const resultado = [];
    const now = new Date();
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mes = d.getMonth() + 1;
      const año = d.getFullYear();
      const prefix = `${año}-${String(mes).padStart(2, '0')}`;

      const [rawF, rawC] = await Promise.all([
        db.select({ total: schema.facturas.total, estado: schema.facturas.estado })
          .from(schema.facturas).where(sql`${schema.facturas.fecha}::text LIKE ${prefix + '%'}`),
        db.select({ monto: schema.cobros.monto })
          .from(schema.cobros).where(sql`${schema.cobros.fecha}::text LIKE ${prefix + '%'} AND ${schema.cobros.estado} = 'aplicado'`),
      ]);

      const facturado = rawF.filter(f => f.estado !== 'cancelada').reduce((s, f) => s + num(f.total), 0);
      const cobrado = rawC.reduce((s, c) => s + num(c.monto), 0);
      const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });

      resultado.push({ mes, año, label, facturado, cobrado });
    }
    return resultado;
  },

  // ── Unidades de Medida ────────────────────────────────────────────────────
  async getUnidades() {
    const rows = await db.select().from(schema.unidades).orderBy(schema.unidades.tipo, schema.unidades.nombre);
    return rows.map(normalizeUnidad);
  },

  async createUnidad(data: { nombre: string; simbolo: string; tipo?: string; activo?: boolean }) {
    const rows = await db.insert(schema.unidades).values({ ...data, activo: data.activo ?? true }).returning();
    return normalizeUnidad(rows[0]);
  },

  async updateUnidad(id: string, data: Partial<{ nombre: string; simbolo: string; tipo: string; activo: boolean }>) {
    const rows = await db.update(schema.unidades).set(data).where(eq(schema.unidades.id, Number(id))).returning();
    return rows[0] ? normalizeUnidad(rows[0]) : null;
  },

  async deleteUnidad(id: string) {
    const rows = await db.delete(schema.unidades).where(eq(schema.unidades.id, Number(id))).returning();
    return rows.length > 0;
  },

  // ── Impuestos ─────────────────────────────────────────────────────────────
  async getImpuestos() {
    const rows = await db.select().from(schema.impuestos).orderBy(schema.impuestos.nombre);
    return rows.map(normalizeImpuesto);
  },

  async getImpuestoDefault() {
    const rows = await db.select().from(schema.impuestos)
      .where(and(eq(schema.impuestos.esPorDefecto, true), eq(schema.impuestos.activo, true)));
    return rows[0] ? normalizeImpuesto(rows[0]) : null;
  },

  async createImpuesto(data: { nombre: string; porcentaje: number; aplicaA?: string; esPorDefecto?: boolean; activo?: boolean }) {
    if (data.esPorDefecto) {
      await db.update(schema.impuestos).set({ esPorDefecto: false });
    }
    const rows = await db.insert(schema.impuestos).values({
      nombre: data.nombre,
      porcentaje: String(data.porcentaje),
      aplicaA: data.aplicaA ?? 'todos',
      esPorDefecto: data.esPorDefecto ?? false,
      activo: data.activo ?? true,
    }).returning();
    return normalizeImpuesto(rows[0]);
  },

  async updateImpuesto(id: string, data: Partial<{ nombre: string; porcentaje: number; aplicaA: string; esPorDefecto: boolean; activo: boolean }>) {
    if (data.esPorDefecto) {
      await db.update(schema.impuestos).set({ esPorDefecto: false });
    }
    const values: Record<string, unknown> = { ...data };
    if (typeof values.porcentaje === 'number') values.porcentaje = String(values.porcentaje);
    const rows = await db.update(schema.impuestos).set(values).where(eq(schema.impuestos.id, Number(id))).returning();
    return rows[0] ? normalizeImpuesto(rows[0]) : null;
  },

  async deleteImpuesto(id: string) {
    const rows = await db.delete(schema.impuestos).where(eq(schema.impuestos.id, Number(id))).returning();
    return rows.length > 0;
  },

  // ── Monedas ───────────────────────────────────────────────────────────────
  async getMonedas() {
    const rows = await db.select().from(schema.monedas).orderBy(schema.monedas.codigo);
    return rows.map(normalizeMoneda);
  },

  async createMoneda(data: { codigo: string; nombre: string; simbolo: string; activo?: boolean }) {
    const rows = await db.insert(schema.monedas).values({ ...data, activo: data.activo ?? true }).returning();
    return normalizeMoneda(rows[0]);
  },

  async updateMoneda(id: string, data: Partial<{ codigo: string; nombre: string; simbolo: string; activo: boolean }>) {
    const rows = await db.update(schema.monedas).set(data).where(eq(schema.monedas.id, Number(id))).returning();
    return rows[0] ? normalizeMoneda(rows[0]) : null;
  },

  async deleteMoneda(id: string) {
    const rows = await db.delete(schema.monedas).where(eq(schema.monedas.id, Number(id))).returning();
    return rows.length > 0;
  },

  // ── Sucursales ────────────────────────────────────────────────────────────

  async getSucursales() {
    const rows = await db.select().from(schema.sucursales).orderBy(schema.sucursales.nombre);
    return rows.map(normalizeId);
  },

  async getSucursal(id: string) {
    const rows = await db.select().from(schema.sucursales).where(eq(schema.sucursales.id, Number(id)));
    return rows[0] ? normalizeId(rows[0]) : undefined;
  },

  async createSucursal(data: { nombre: string; descripcion?: string; direccion?: string; telefono?: string; almacenId?: string; almacenNombre?: string; activo?: boolean }) {
    const rows = await db.insert(schema.sucursales).values({
      nombre: data.nombre,
      descripcion: data.descripcion ?? '',
      direccion: data.direccion ?? '',
      telefono: data.telefono ?? '',
      almacenId: data.almacenId ? Number(data.almacenId) : null,
      almacenNombre: data.almacenNombre ?? '',
      activo: data.activo ?? true,
    }).returning();
    return normalizeId(rows[0]);
  },

  async updateSucursal(id: string, data: Record<string, unknown>) {
    const rows = await db.update(schema.sucursales).set(data).where(eq(schema.sucursales.id, Number(id))).returning();
    return rows[0] ? normalizeId(rows[0]) : null;
  },

  async deleteSucursal(id: string) {
    const rows = await db.delete(schema.sucursales).where(eq(schema.sucursales.id, Number(id))).returning();
    return rows.length > 0;
  },

  // ── Asignación Usuario ↔ Sucursal ─────────────────────────────────────────

  async getSucursalesUsuario(usuarioId: string) {
    const asignaciones = await db.select().from(schema.usuarioSucursales)
      .where(eq(schema.usuarioSucursales.usuarioId, Number(usuarioId)));
    if (asignaciones.length === 0) return [];
    const ids = asignaciones.map(a => a.sucursalId);
    const rows = await db.select().from(schema.sucursales)
      .where(inArray(schema.sucursales.id, ids));
    return rows.map(normalizeId);
  },

  async asignarSucursalUsuario(usuarioId: string, sucursalId: string) {
    const rows = await db.insert(schema.usuarioSucursales)
      .values({ usuarioId: Number(usuarioId), sucursalId: Number(sucursalId) })
      .onConflictDoNothing()
      .returning();
    return rows[0] ? normalizeId(rows[0]) : null;
  },

  async desasignarSucursalUsuario(usuarioId: string, sucursalId: string) {
    const rows = await db.delete(schema.usuarioSucursales)
      .where(and(
        eq(schema.usuarioSucursales.usuarioId, Number(usuarioId)),
        eq(schema.usuarioSucursales.sucursalId, Number(sucursalId)),
      ))
      .returning();
    return rows.length > 0;
  },
};
