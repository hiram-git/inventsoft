// node-thermal-printer does not ship types; loaded via require inside buildPrinter

export interface PrinterConfig {
  impresoraConexion?: string | null;  // 'network' | 'usb'
  impresoraHost?: string | null;
  impresoraPuerto?: number | null;
  impresoraDispositivo?: string | null;
  impresoraAncho?: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPrinter(cfg: PrinterConfig) {
  const conexion  = cfg.impresoraConexion  ?? 'network';
  const host      = cfg.impresoraHost      ?? '192.168.1.100';
  const port      = cfg.impresoraPuerto    ?? 9100;
  const device    = cfg.impresoraDispositivo ?? '/dev/usb/lp0';
  const width     = cfg.impresoraAncho     ?? 32;

  const { ThermalPrinter: Printer, PrinterTypes: Types } = require('node-thermal-printer');

  return new Printer({
    type: Types.EPSON,
    interface: conexion === 'usb' ? `file://${device}` : `tcp://${host}:${port}`,
    characterSet: 'PC858_EURO',
    removeSpecialCharacters: false,
    lineCharacter: '-',
    width,
  });
}

/** Pad string on the right to length n */
function padR(s: string, n: number) { return s.substring(0, n).padEnd(n); }
/** Pad string on the left to length n */
function padL(s: string, n: number) { return s.substring(0, n).padStart(n); }

/** Two-column line: left + right justified, total = w chars */
function twoCol(left: string, right: string, w: number) {
  const max = w - right.length - 1;
  return padR(left, max) + ' ' + right;
}

/** Format currency */
function money(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Ticket builders ──────────────────────────────────────────────────────────

export async function imprimirTicketFactura(factura: any, empresa: any): Promise<void> {
  const printer = buildPrinter(empresa);
  const w = empresa.impresoraAncho ?? 32;

  printer.alignCenter();
  printer.bold(true); printer.setTextDoubleHeight(); printer.println(empresa.nombre ?? 'Empresa');
  printer.setTextNormal(); printer.bold(false);
  if (empresa.rfc)       printer.println(empresa.rfc);
  if (empresa.direccion) printer.println(empresa.direccion);
  if (empresa.telefono)  printer.println(`Tel: ${empresa.telefono}`);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`Factura : ${factura.numero}`);
  printer.println(`Fecha   : ${factura.fecha}`);
  if (factura.fechaVencimiento)
    printer.println(`Vence   : ${factura.fechaVencimiento}`);
  printer.println(`Cliente : ${factura.clienteNombre}`);
  printer.println(`Estado  : ${factura.estado.toUpperCase()}`);
  printer.drawLine();

  for (const item of factura.items ?? []) {
    printer.println(item.productoNombre.substring(0, w));
    printer.println(twoCol(`  ${item.cantidad} x ${money(item.precioUnitario)}`, money(item.subtotal), w));
  }

  printer.drawLine();
  printer.alignRight();
  printer.println(twoCol('Subtotal:', money(factura.subtotal), w));
  printer.println(twoCol('IVA 16%:', money(factura.iva), w));
  printer.bold(true); printer.setTextDoubleHeight();
  printer.println(twoCol('TOTAL:', money(factura.total), w));
  printer.setTextNormal(); printer.bold(false);

  printer.drawLine();
  printer.alignCenter();
  printer.println('¡Gracias por su compra!');
  if (empresa.email) printer.println(empresa.email);

  printer.cut();
  await printer.execute();
}

export async function imprimirTicketCobro(cobro: any, factura: any, empresa: any): Promise<void> {
  const printer = buildPrinter(empresa);
  const w = empresa.impresoraAncho ?? 32;

  printer.alignCenter();
  printer.bold(true); printer.setTextDoubleHeight(); printer.println(empresa.nombre ?? 'Empresa');
  printer.setTextNormal(); printer.bold(false);
  if (empresa.rfc) printer.println(empresa.rfc);
  printer.drawLine();

  printer.alignCenter();
  printer.bold(true); printer.println('RECIBO DE PAGO'); printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`Cobro   : ${cobro.numero}`);
  printer.println(`Fecha   : ${cobro.fecha}`);
  printer.println(`Cliente : ${cobro.clienteNombre}`);
  printer.println(`Factura : ${cobro.facturaNumero}`);
  printer.println(`Metodo  : ${cobro.metodoPago.toUpperCase()}`);
  if (cobro.referencia) printer.println(`Ref     : ${cobro.referencia}`);
  printer.drawLine();

  if (factura) {
    printer.println(twoCol('Total factura:', money(factura.total), w));
    printer.println(twoCol('Pagado antes:', money(factura.total - factura.saldo - cobro.monto), w));
  }

  printer.bold(true); printer.setTextDoubleHeight();
  printer.println(twoCol('MONTO COBRADO:', money(cobro.monto), w));
  printer.setTextNormal(); printer.bold(false);

  if (factura && factura.saldo !== undefined) {
    const saldoRestante = Math.max(0, factura.saldo - cobro.monto);
    printer.println(twoCol('Saldo pendiente:', money(saldoRestante), w));
  }

  printer.drawLine();
  printer.alignCenter();
  printer.println('Pago recibido conforme');
  if (cobro.notas) printer.println(cobro.notas.substring(0, w));

  printer.cut();
  await printer.execute();
}

export async function imprimirTicketCotizacion(cot: any, empresa: any): Promise<void> {
  const printer = buildPrinter(empresa);
  const w = empresa.impresoraAncho ?? 32;

  printer.alignCenter();
  printer.bold(true); printer.setTextDoubleHeight(); printer.println(empresa.nombre ?? 'Empresa');
  printer.setTextNormal(); printer.bold(false);
  if (empresa.rfc)       printer.println(empresa.rfc);
  if (empresa.direccion) printer.println(empresa.direccion);
  printer.drawLine();

  printer.alignCenter();
  printer.bold(true); printer.println('COTIZACION'); printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`No      : ${cot.numero}`);
  printer.println(`Fecha   : ${cot.fecha}`);
  if (cot.fechaVencimiento)
    printer.println(`Valida  : ${cot.fechaVencimiento}`);
  printer.println(`Cliente : ${cot.clienteNombre}`);
  printer.drawLine();

  for (const item of cot.items ?? []) {
    printer.println(item.productoNombre.substring(0, w));
    printer.println(twoCol(`  ${item.cantidad} x ${money(item.precioUnitario)}`, money(item.subtotal), w));
  }

  printer.drawLine();
  printer.alignRight();
  printer.println(twoCol('Subtotal:', money(cot.subtotal), w));
  printer.println(twoCol('IVA 16%:', money(cot.iva), w));
  printer.bold(true); printer.setTextDoubleHeight();
  printer.println(twoCol('TOTAL:', money(cot.total), w));
  printer.setTextNormal(); printer.bold(false);

  printer.drawLine();
  printer.alignCenter();
  if (cot.notas) { printer.println(cot.notas.substring(0, w)); printer.newLine(); }
  printer.println('Cotizacion sujeta a cambios');
  printer.println('sin previo aviso');

  printer.cut();
  await printer.execute();
}

export async function imprimirTicketPedido(pedido: any, empresa: any): Promise<void> {
  const printer = buildPrinter(empresa);
  const w = empresa.impresoraAncho ?? 32;

  printer.alignCenter();
  printer.bold(true); printer.setTextDoubleHeight(); printer.println(empresa.nombre ?? 'Empresa');
  printer.setTextNormal(); printer.bold(false);
  printer.drawLine();

  printer.alignCenter();
  printer.bold(true); printer.println('PEDIDO'); printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`Pedido  : ${pedido.numero}`);
  printer.println(`Fecha   : ${pedido.fecha}`);
  printer.println(`Cliente : ${pedido.clienteNombre}`);
  printer.println(`Almacen : ${pedido.almacenNombre}`);
  printer.println(`Estado  : ${pedido.estado.toUpperCase()}`);
  printer.drawLine();

  for (const item of pedido.items ?? []) {
    printer.println(item.productoNombre.substring(0, w));
    printer.println(twoCol(`  ${item.cantidad} x ${money(item.precioUnitario)}`, money(item.subtotal), w));
  }

  printer.drawLine();
  printer.alignRight();
  printer.println(twoCol('Subtotal:', money(pedido.subtotal), w));
  printer.println(twoCol('IVA 16%:', money(pedido.iva), w));
  printer.bold(true); printer.setTextDoubleHeight();
  printer.println(twoCol('TOTAL:', money(pedido.total), w));
  printer.setTextNormal(); printer.bold(false);

  if (pedido.notas) {
    printer.drawLine();
    printer.alignLeft();
    printer.println(pedido.notas.substring(0, w));
  }

  printer.cut();
  await printer.execute();
}
