// PDF generation using pdfkit (pure Node.js, no browser required)
// Each function returns a Buffer containing the PDF bytes.

// @ts-ignore - pdfkit has no bundled types in some setups
import PDFDocument from 'pdfkit';

const L = 50;          // left margin
const W = 495.28;      // usable width (A4 595.28 - margins)
const R = 545.28;      // right edge
const ROW_H = 20;      // table row height
const HEAD_H = 22;     // table header height

// ─── colour palette ────────────────────────────────────────────────────────
const BLUE   = '#2563eb';
const GREEN  = '#16a34a';
const PURPLE = '#7c3aed';
const DARK   = '#1e293b';
const MUTED  = '#64748b';
const LIGHT  = '#f8fafc';
const BORDER = '#e2e8f0';

// ─── helpers ───────────────────────────────────────────────────────────────
function pdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function header(doc: PDFKit.PDFDocument, accentColor: string, docType: string, numero: string, fecha: string, empresa: { nombre?: string; rfc?: string; direccion?: string; telefono?: string; email?: string } | null) {
  // Accent bar
  doc.rect(0, 0, 595.28, 8).fill(accentColor);

  // Company name
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(16).text(empresa?.nombre ?? 'Mi Empresa', L, 22, { width: 260 });

  const info = [empresa?.rfc && `RFC: ${empresa.rfc}`, empresa?.direccion, empresa?.telefono && `Tel: ${empresa.telefono}`, empresa?.email].filter(Boolean).join('\n');
  if (info) doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(info, L, 42, { width: 260 });

  // Document type block (top-right)
  doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(22).text(docType.toUpperCase(), R - 200, 18, { width: 200, align: 'right' });
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13).text(numero, R - 200, 44, { width: 200, align: 'right' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`Fecha: ${fecha}`, R - 200, 60, { width: 200, align: 'right' });

  // Divider
  doc.strokeColor(BORDER).lineWidth(1).moveTo(L, 84).lineTo(R, 84).stroke();
}

function infoBox(doc: PDFKit.PDFDocument, y: number, fields: [string, string][]) {
  const colW = W / Math.min(fields.length, 4);
  doc.rect(L, y, W, 46).fill(LIGHT);
  fields.slice(0, 4).forEach(([label, value], i) => {
    const x = L + i * colW + 8;
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(label.toUpperCase(), x, y + 6, { width: colW - 10 });
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(value || '—', x, y + 16, { width: colW - 10 });
  });
  return y + 54;
}

function tableHeader(doc: PDFKit.PDFDocument, y: number, cols: { label: string; width: number; align?: string }[], bgColor = DARK) {
  let x = L;
  doc.rect(L, y, W, HEAD_H).fill(bgColor);
  cols.forEach(col => {
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
       .text(col.label, x + 4, y + 7, { width: col.width - 8, align: (col.align ?? 'left') as any });
    x += col.width;
  });
  return y + HEAD_H;
}

function tableRow(doc: PDFKit.PDFDocument, y: number, cells: { text: string; width: number; align?: string }[], shade: boolean, textColor = DARK) {
  if (shade) doc.rect(L, y, W, ROW_H).fill(LIGHT);
  let x = L;
  cells.forEach(cell => {
    doc.fillColor(textColor).font('Helvetica').fontSize(9)
       .text(cell.text, x + 4, y + 6, { width: cell.width - 8, align: (cell.align ?? 'left') as any });
    x += cell.width;
  });
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(L, y + ROW_H).lineTo(R, y + ROW_H).stroke();
  return y + ROW_H;
}

function totalsSection(doc: PDFKit.PDFDocument, y: number, subtotal: number, iva: number, total: number, accentColor: string, extraRows?: [string, string][]) {
  const tw = 200;
  const tx = R - tw;
  let cy = y + 8;
  const row = (label: string, value: string, bold = false, color = DARK) => {
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(label, tx, cy, { width: 110 });
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9)
       .text(value, tx + 110, cy, { width: tw - 114, align: 'right' });
    cy += 16;
  };
  row('Subtotal', fmt(subtotal));
  row('IVA (16%)', fmt(iva));
  if (extraRows) extraRows.forEach(([l, v]) => row(l, v));
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(tx, cy + 2).lineTo(R, cy + 2).stroke();
  cy += 6;
  row('TOTAL', fmt(total), true, accentColor);
  return cy + 16;
}

function footer(doc: PDFKit.PDFDocument, numero: string, empresa: { nombre?: string } | null) {
  const y = 810;
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(L, y).lineTo(R, y).stroke();
  doc.fillColor(MUTED).font('Helvetica').fontSize(7)
     .text(`Generado el ${new Date().toLocaleDateString('es-MX')}`, L, y + 6)
     .text(`${numero} — ${empresa?.nombre ?? ''}`, L, y + 6, { width: W, align: 'right' });
}

// ─── FACTURA PDF ────────────────────────────────────────────────────────────
export async function generateFacturaPDF(
  factura: { numero: string; fecha: string; fechaVencimiento?: string | null; estado: string; clienteNombre: string; almacenNombre?: string | null; items: any[]; subtotal: number; iva: number; total: number },
  empresa: any
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: factura.numero } });

  header(doc, BLUE, 'Factura', factura.numero, factura.fecha, empresa);

  // Estado badge
  const estadoColors: Record<string, string> = { pagada: GREEN, pendiente: '#f59e0b', parcial: '#f97316', vencida: '#ef4444', cancelada: MUTED };
  const estadoColor = estadoColors[factura.estado] ?? MUTED;
  doc.rect(R - 75, 16, 72, 20).fill(estadoColor).fillOpacity(0.15);
  doc.rect(R - 75, 16, 72, 20).stroke(estadoColor);
  doc.fillColor(estadoColor).font('Helvetica-Bold').fontSize(8).fillOpacity(1)
     .text(factura.estado.toUpperCase(), R - 73, 22, { width: 68, align: 'center' });

  let y = 92;

  const fields: [string, string][] = [
    ['Cliente', factura.clienteNombre],
    ['Fecha', factura.fecha],
    ['Vencimiento', factura.fechaVencimiento ?? '—'],
    ['Estado', factura.estado],
  ];
  if (factura.almacenNombre) fields[3] = ['Almacén', factura.almacenNombre];
  y = infoBox(doc, y, fields);

  // Items table
  const cols = [
    { label: 'Descripción',  width: 200 },
    { label: 'Tipo',         width: 60  },
    { label: 'P. Unitario',  width: 80, align: 'right' },
    { label: 'Cant.',        width: 55, align: 'right' },
    { label: 'Subtotal',     width: 100, align: 'right' },
  ];
  y = tableHeader(doc, y, cols, BLUE);
  factura.items.forEach((item, i) => {
    y = tableRow(doc, y, [
      { text: item.productoNombre,              width: 200 },
      { text: item.tipo === 'servicio' ? 'Servicio' : 'Producto', width: 60 },
      { text: fmt(item.precioUnitario),         width: 80,  align: 'right' },
      { text: String(item.cantidad),            width: 55,  align: 'right' },
      { text: fmt(item.subtotal),               width: 100, align: 'right' },
    ], i % 2 === 0);
  });

  y = totalsSection(doc, y + 8, factura.subtotal, factura.iva, factura.total, BLUE);
  footer(doc, factura.numero, empresa);

  return pdfBuffer(doc);
}

// ─── PEDIDO PDF ─────────────────────────────────────────────────────────────
export async function generatePedidoPDF(
  pedido: { numero: string; fecha: string; estado: string; clienteNombre: string; almacenNombre: string; notas?: string | null; items: any[]; subtotal: number; iva: number; total: number },
  empresa: any
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: pedido.numero } });

  header(doc, GREEN, 'Pedido', pedido.numero, pedido.fecha, empresa);

  let y = 92;
  y = infoBox(doc, y, [
    ['Cliente', pedido.clienteNombre],
    ['Almacén', pedido.almacenNombre],
    ['Fecha',   pedido.fecha],
    ['Estado',  pedido.estado],
  ]);

  if (pedido.notas) {
    doc.rect(L, y, W, 28).fill(LIGHT);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text('NOTAS', L + 8, y + 5);
    doc.fillColor(DARK).font('Helvetica').fontSize(9).text(pedido.notas, L + 8, y + 14, { width: W - 16 });
    y += 36;
  }

  const cols = [
    { label: 'Producto',    width: 245 },
    { label: 'P. Unitario', width: 100, align: 'right' },
    { label: 'Cantidad',    width: 80,  align: 'right' },
    { label: 'Subtotal',    width: 70,  align: 'right' },
  ];
  y = tableHeader(doc, y, cols, '#166534');
  pedido.items.forEach((item, i) => {
    y = tableRow(doc, y, [
      { text: item.productoNombre,   width: 245 },
      { text: fmt(item.precioUnitario), width: 100, align: 'right' },
      { text: String(item.cantidad),    width: 80,  align: 'right' },
      { text: fmt(item.subtotal),       width: 70,  align: 'right' },
    ], i % 2 === 0);
  });

  y = totalsSection(doc, y + 8, pedido.subtotal, pedido.iva, pedido.total, GREEN);
  footer(doc, pedido.numero, empresa);

  return pdfBuffer(doc);
}

// ─── COTIZACIÓN PDF ──────────────────────────────────────────────────────────
export async function generateCotizacionPDF(
  cot: { numero: string; fecha: string; fechaVencimiento?: string | null; estado: string; clienteNombre: string; notas?: string | null; items: any[]; subtotal: number; iva: number; total: number },
  empresa: any
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: cot.numero } });

  header(doc, PURPLE, 'Cotización', cot.numero, cot.fecha, empresa);

  let y = 92;
  y = infoBox(doc, y, [
    ['Cliente',      cot.clienteNombre],
    ['Fecha',        cot.fecha],
    ['Válida hasta', cot.fechaVencimiento ?? '—'],
    ['Estado',       cot.estado],
  ]);

  if (cot.fechaVencimiento) {
    doc.rect(L, y, W, 22).fill('#f3e8ff');
    doc.fillColor(PURPLE).font('Helvetica').fontSize(8)
       .text(`Esta cotización es válida hasta el ${cot.fechaVencimiento}. Los precios están sujetos a cambio después de esta fecha.`, L + 8, y + 7, { width: W - 16 });
    y += 30;
  }

  const cols = [
    { label: 'Descripción',  width: 200 },
    { label: 'Tipo',         width: 60  },
    { label: 'P. Unitario',  width: 80, align: 'right' },
    { label: 'Cant.',        width: 55, align: 'right' },
    { label: 'Subtotal',     width: 100, align: 'right' },
  ];
  y = tableHeader(doc, y, cols, '#4c1d95');
  cot.items.forEach((item, i) => {
    y = tableRow(doc, y, [
      { text: item.productoNombre,   width: 200 },
      { text: item.tipo === 'servicio' ? 'Servicio' : 'Producto', width: 60 },
      { text: fmt(item.precioUnitario), width: 80,  align: 'right' },
      { text: String(item.cantidad),    width: 55,  align: 'right' },
      { text: fmt(item.subtotal),       width: 100, align: 'right' },
    ], i % 2 === 0);
  });

  y = totalsSection(doc, y + 8, cot.subtotal, cot.iva, cot.total, PURPLE);

  if (cot.notas) {
    y += 8;
    doc.rect(L, y, W, 28).fill(LIGHT);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text('CONDICIONES / NOTAS', L + 8, y + 5);
    doc.fillColor(DARK).font('Helvetica').fontSize(9).text(cot.notas, L + 8, y + 14, { width: W - 16 });
    y += 36;
  }

  // Signature lines
  y = Math.max(y + 20, 700);
  const sigW = (W - 40) / 2;
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(L, y).lineTo(L + sigW, y).stroke();
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(R - sigW, y).lineTo(R, y).stroke();
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
     .text(`Firma — ${empresa?.nombre ?? ''}`, L, y + 5, { width: sigW, align: 'center' })
     .text(`Aceptado por — ${cot.clienteNombre}`, R - sigW, y + 5, { width: sigW, align: 'center' });

  footer(doc, cot.numero, empresa);
  return pdfBuffer(doc);
}

// ─── REPORTE DE VENTAS PDF ───────────────────────────────────────────────────
const TEAL = '#0f766e';

export async function generateReportePDF(
  reporte: {
    mes: number; año: number;
    totalFacturado: number; totalCobrado: number; saldoPendiente: number;
    porEstado: Record<string, number>;
    topClientes: { nombre: string; total: number; count: number }[];
    topProductos: { nombre: string; tipo: string; cantidad: number; total: number }[];
    cobros: { monto: number }[];
    facturas: { numero: string; fecha: string; clienteNombre: string; estado: string; total: number }[];
    porMetodo: Record<string, number>;
  },
  meses: { label: string; facturado: number; cobrado: number }[],
  empresa: any
): Promise<Buffer> {
  const mesesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const titulo = `${mesesNombre[reporte.mes - 1]} ${reporte.año}`;

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Reporte ${titulo}` } });

  // Header
  doc.rect(0, 0, 595.28, 8).fill(TEAL);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(16).text(empresa?.nombre ?? 'Mi Empresa', L, 22);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(empresa?.rfc ? `RFC: ${empresa.rfc}` : '', L, 42);
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(18).text('REPORTE DE VENTAS', R - 220, 18, { width: 220, align: 'right' });
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12).text(titulo, R - 220, 42, { width: 220, align: 'right' });
  doc.strokeColor(BORDER).lineWidth(1).moveTo(L, 60).lineTo(R, 60).stroke();

  let y = 68;

  // Summary row (4 boxes)
  const boxW = W / 4;
  const summaries = [
    { label: 'Total Facturado', value: fmt(reporte.totalFacturado), color: BLUE },
    { label: 'Total Cobrado',   value: fmt(reporte.totalCobrado),   color: GREEN },
    { label: 'Saldo Pendiente', value: fmt(reporte.saldoPendiente), color: '#ef4444' },
    { label: 'Facturas',        value: String(reporte.facturas.length), color: TEAL },
  ];
  summaries.forEach((s, i) => {
    const bx = L + i * boxW;
    doc.rect(bx, y, boxW - 4, 44).fill(LIGHT);
    doc.strokeColor(s.color).lineWidth(2).moveTo(bx, y).lineTo(bx, y + 44).stroke();
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(s.label, bx + 8, y + 6, { width: boxW - 16 });
    doc.fillColor(s.color).font('Helvetica-Bold').fontSize(13).text(s.value, bx + 8, y + 18, { width: boxW - 16 });
  });
  y += 52;

  // Two column: Estado + Métodos de pago
  const colA = L, colAW = 230, colB = L + colAW + 10, colBW = W - colAW - 10;

  // Estado de facturas
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Estado de Facturas', colA, y);
  y += 14;
  const estados = [['pagada','Pagada',GREEN],['pendiente','Pendiente','#f59e0b'],['parcial','Parcial','#f97316'],['vencida','Vencida','#ef4444'],['cancelada','Cancelada',MUTED]] as const;
  const totalF = reporte.facturas.length || 1;
  estados.forEach(([key, label, color]) => {
    const n = reporte.porEstado[key] ?? 0;
    if (n === 0) return;
    const pct = n / totalF;
    doc.fillColor(color as string).font('Helvetica').fontSize(8).text(`${label}: ${n}`, colA, y);
    doc.rect(colA + 80, y + 1, colAW - 86, 8).fill('#f1f5f9');
    doc.rect(colA + 80, y + 1, Math.max(2, (colAW - 86) * pct), 8).fill(color as string);
    y += 14;
  });

  // Top clientes
  let yB = y - (estados.filter(([k]) => (reporte.porEstado[k] ?? 0) > 0).length * 14) - 14;
  yB += 14;
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Top Clientes', colB, yB - 14);
  reporte.topClientes.slice(0, 5).forEach((c, i) => {
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`${i + 1}.`, colB, yB);
    doc.fillColor(DARK).font('Helvetica').fontSize(8).text(c.nombre, colB + 12, yB, { width: colBW - 70 });
    doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(8).text(fmt(c.total), colB + colBW - 58, yB, { width: 58, align: 'right' });
    yB += 12;
  });

  y = Math.max(y, yB) + 12;

  // Comparativa mensual
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Comparativa Mensual', L, y);
  y += 14;
  const mCols = [
    { label: 'Período',       width: 80 },
    { label: 'Facturado',     width: 140, align: 'right' },
    { label: 'Cobrado',       width: 140, align: 'right' },
    { label: 'Diferencia',    width: 135, align: 'right' },
  ];
  y = tableHeader(doc, y, mCols, TEAL);
  meses.forEach((m, i) => {
    const diff = m.cobrado - m.facturado;
    const isActual = m.label.includes(titulo.split(' ')[0]);
    y = tableRow(doc, y, [
      { text: m.label,          width: 80 },
      { text: fmt(m.facturado), width: 140, align: 'right' },
      { text: fmt(m.cobrado),   width: 140, align: 'right' },
      { text: (diff >= 0 ? '+' : '') + fmt(diff), width: 135, align: 'right' },
    ], i % 2 === 0, isActual ? TEAL : DARK);
  });
  y += 10;

  // Top productos
  if (reporte.topProductos.length > 0) {
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Top Productos / Servicios', L, y);
    y += 14;
    const pCols = [
      { label: '#',           width: 25 },
      { label: 'Descripción', width: 225 },
      { label: 'Tipo',        width: 70 },
      { label: 'Cant.',       width: 60,  align: 'right' },
      { label: 'Total',       width: 115, align: 'right' },
    ];
    y = tableHeader(doc, y, pCols, DARK);
    reporte.topProductos.slice(0, 8).forEach((p, i) => {
      y = tableRow(doc, y, [
        { text: String(i + 1),    width: 25 },
        { text: p.nombre,         width: 225 },
        { text: p.tipo === 'servicio' ? 'Servicio' : 'Producto', width: 70 },
        { text: String(p.cantidad), width: 60,  align: 'right' },
        { text: fmt(p.total),       width: 115, align: 'right' },
      ], i % 2 === 0);
    });
    y += 10;
  }

  // Facturas list
  if (y < 640 && reporte.facturas.length > 0) {
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Facturas del Período', L, y);
    y += 14;
    const fCols = [
      { label: 'Número',  width: 80 },
      { label: 'Fecha',   width: 80 },
      { label: 'Cliente', width: 220 },
      { label: 'Estado',  width: 75 },
      { label: 'Total',   width: 80, align: 'right' },
    ];
    y = tableHeader(doc, y, fCols, DARK);
    const maxRows = Math.floor((800 - y) / ROW_H);
    reporte.facturas.slice(0, maxRows).forEach((f, i) => {
      y = tableRow(doc, y, [
        { text: f.numero,          width: 80 },
        { text: f.fecha,           width: 80 },
        { text: f.clienteNombre,   width: 220 },
        { text: f.estado,          width: 75 },
        { text: fmt(f.total),      width: 80, align: 'right' },
      ], i % 2 === 0);
    });
    // Total footer row
    doc.rect(L, y, W, ROW_H).fill('#f0fdf4');
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('Total facturado (activas)', L + 4, y + 6, { width: 395 });
    doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(10).text(fmt(reporte.totalFacturado), L + 415, y + 5, { width: 76, align: 'right' });
  }

  footer(doc, `Reporte ${titulo}`, empresa);
  return pdfBuffer(doc);
}
