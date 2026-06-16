import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  type Cotizacion,
  calcLiquidacion,
  calcPlanPagos,
  cotizacionTotal,
  fmtMoney,
} from "@/lib/cotizacion/types";

const NAVY = rgb(0.153, 0.133, 0.333);
const ORANGE = rgb(1, 0.5, 0);
const GRAY = rgb(0.42, 0.45, 0.5);
const LIGHT = rgb(0.957, 0.961, 0.976);
const BORDER = rgb(0.9, 0.91, 0.93);

const A4 = { w: 595.28, h: 841.89 };
const M = 40;

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

// La fuente Helvetica (WinAnsi) no codifica estrellas/emojis/comillas tipográficas.
// Normalizamos los comunes y descartamos lo que quede fuera del rango.
function safeText(s: string): string {
  return (s ?? "")
    .replace(/[★☆]/g, "*")
    .replace(/[•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

/** Top-down layout helper over pdf-lib (which is bottom-up). */
class Doc {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;

  async init() {
    this.doc = await PDFDocument.create();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - M;
  }
  ensure(space: number) {
    if (this.y - space < M + 24) this.newPage();
  }
  text(raw: string, x: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; right?: number } = {}) {
    const t = safeText(raw);
    const size = opts.size ?? 9;
    const f = opts.bold ? this.bold : this.font;
    let px = x;
    if (opts.right != null) px = opts.right - f.widthOfTextAtSize(t, size);
    this.page.drawText(t, { x: px, y: this.y, size, font: f, color: opts.color ?? NAVY });
  }
  wrap(raw: string, x: number, maxW: number, size = 9, color = GRAY) {
    const words = safeText(raw || "").split(/\s+/).filter(Boolean);
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (this.font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const ln of lines) {
      this.ensure(size + 3);
      this.page.drawText(ln, { x, y: this.y, size, font: this.font, color });
      this.y -= size + 3;
    }
  }
  heading(t: string) {
    this.ensure(22);
    this.y -= 14;
    this.text(t.toUpperCase(), M, { size: 10, bold: true, color: NAVY });
    this.y -= 4;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.7, color: BORDER });
    this.y -= 10;
  }
  kv(label: string, value: string, x: number, w: number) {
    this.text(label, x, { size: 8, color: GRAY });
    this.text(value || "—", x, { size: 8, bold: true, right: x + w });
  }
  box(x: number, w: number, h: number) {
    this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, color: LIGHT, borderColor: BORDER, borderWidth: 0.5 });
  }
  hr() {
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.5, color: BORDER });
    this.y -= 8;
  }
  toBuffer(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

export type CotizacionPDFOpts = { agencia: string; fecha: string };

export async function renderCotizacionPDF(c: Cotizacion, opts: CotizacionPDFOpts): Promise<Buffer> {
  const d = new Doc();
  await d.init();
  const r = c.reserva;
  const moneda = c.moneda || "USD";
  const liq = r ? calcLiquidacion(r) : null;
  const total = liq ? liq.totalAPagar : cotizacionTotal(c.items, c.descuento);
  const pagos = r ? calcPlanPagos(r, total) : [];
  const itin = c.itinerario ?? [];
  const colR = A4.w - M;

  // ── Header ──
  d.text(opts.agencia || "Turistea CRM", M, { size: 16, bold: true, color: NAVY });
  d.text("COTIZACIÓN", M, { size: 13, bold: true, color: ORANGE, right: colR });
  d.y -= 14;
  d.text("Cotización de viaje", M, { size: 8, color: GRAY });
  d.text(`Ref: ${c.id.slice(0, 8).toUpperCase()}  ·  ${opts.fecha}  ·  Validez ${c.validez_dias} días`, M, { size: 8, color: GRAY, right: colR });
  d.y -= 6;
  d.page.drawLine({ start: { x: M, y: d.y }, end: { x: colR, y: d.y }, thickness: 1.5, color: NAVY });
  d.y -= 6;

  // ── Plan + Cliente (dos columnas) ──
  const colW = (colR - M - 12) / 2;
  const x2 = M + colW + 12;
  const topY = d.y;
  // Plan
  d.heading("Plan");
  d.text(r?.plan.nombre ?? c.titulo, M, { size: 9, bold: true });
  d.y -= 12;
  if (r) {
    d.kv("Salida", r.plan.fecha_salida ?? "—", M, colW); d.y -= 12;
    d.kv("Regreso", r.plan.fecha_regreso ?? "—", M, colW); d.y -= 12;
    d.kv("Origen", r.plan.ciudad_origen ?? "—", M, colW); d.y -= 12;
    d.kv("Duración", r.plan.dias ? `${r.plan.dias} días` : "—", M, colW); d.y -= 12;
    d.kv("Aerolínea", r.plan.aerolinea ?? "—", M, colW); d.y -= 12;
  }
  const leftEndY = d.y;
  // Cliente (columna derecha, desde topY)
  d.y = topY;
  d.heading("Cliente");
  d.kv("Agencia", r?.contacto.agencia_nombre ?? opts.agencia, x2, colW); d.y -= 12;
  d.kv("Agente", r?.contacto.nombre_agente ?? "—", x2, colW); d.y -= 12;
  d.kv("Email", r?.contacto.email_agente ?? "—", x2, colW); d.y -= 12;
  d.kv("Teléfono", r?.contacto.telefono_agente ?? "—", x2, colW); d.y -= 12;
  d.y = Math.min(leftEndY, d.y) - 4;

  // ── Pasajeros ──
  if (r && r.pasajeros.length > 0) {
    d.heading("Pasajeros");
    const cols = [M, M + 230, M + 350, M + 440];
    d.text("Nombre", cols[0], { size: 8, bold: true });
    d.text("Documento", cols[1], { size: 8, bold: true });
    d.text("Tipo", cols[2], { size: 8, bold: true });
    d.text("Nacimiento", cols[3], { size: 8, bold: true });
    d.y -= 4; d.hr();
    for (const p of r.pasajeros) {
      d.ensure(14);
      d.text(p.nombre || "—", cols[0], { size: 8 });
      d.text(p.documento || "—", cols[1], { size: 8 });
      d.text(p.tipo === "adulto" ? "Adulto" : p.tipo === "nino" ? "Niño" : "Infante", cols[2], { size: 8 });
      d.text(p.fecha_nacimiento || "—", cols[3], { size: 8 });
      d.y -= 13;
    }
  }

  // ── Itinerario ──
  if (itin.length > 0) {
    d.heading("Itinerario");
    for (const day of itin) {
      d.ensure(16);
      const t = `Día ${day.dia}${day.titulo ? ` — ${day.titulo}` : ""}${day.ciudad ? ` (${day.ciudad})` : ""}`;
      d.text(t, M, { size: 9, bold: true });
      d.y -= 12;
      if (day.descripcion) d.wrap(stripHtml(day.descripcion), M, colR - M, 8);
      d.y -= 4;
    }
  }

  // ── Servicios ──
  if (r && (r.snapshots.incluye || r.snapshots.no_incluye)) {
    if (r.snapshots.incluye) { d.heading("Incluye"); d.wrap(stripHtml(r.snapshots.incluye), M, colR - M, 8); }
    if (r.snapshots.no_incluye) { d.heading("No incluye"); d.wrap(stripHtml(r.snapshots.no_incluye), M, colR - M, 8); }
  }

  // ── Liquidación ──
  d.heading("Liquidación");
  const liqRow = (label: string, val: string) => {
    d.ensure(13);
    d.text(label, M, { size: 8, color: GRAY });
    d.text(val, M, { size: 8, right: colR });
    d.y -= 12;
  };
  if (liq && r) {
    liqRow(`Acomodación (${r.acom.sencilla} sgl · ${r.acom.doble} dbl · ${r.acom.triple} tpl · ${r.acom.nino} niño)`, fmtMoney(liq.totalAcom, moneda));
    liqRow(`Comisión (${r.liquidacion.comision_pct}%)`, `− ${fmtMoney(liq.comisionVal, moneda)}`);
    if (r.liquidacion.otros_descuentos) liqRow("Otros descuentos", `− ${fmtMoney(r.liquidacion.otros_descuentos, moneda)}`);
    liqRow("Subtotal neto", fmtMoney(liq.subtotalNeto, moneda));
    if (liq.ivaVal) liqRow(`IVA (${r.liquidacion.iva_pct}%)`, fmtMoney(liq.ivaVal, moneda));
    if (liq.retefuenteVal) liqRow("Retefuente", `− ${fmtMoney(liq.retefuenteVal, moneda)}`);
    if (liq.reteivaVal) liqRow("ReteIVA", `− ${fmtMoney(liq.reteivaVal, moneda)}`);
    if (liq.reteicaVal) liqRow("ReteICA", `− ${fmtMoney(liq.reteicaVal, moneda)}`);
  } else {
    for (const it of c.items) liqRow(`${it.nombre} × ${it.cantidad}`, fmtMoney(it.cantidad * it.precio_unitario, moneda));
  }
  d.y -= 2; d.hr();
  d.ensure(16);
  d.text("Total a pagar", M, { size: 11, bold: true });
  d.text(fmtMoney(total, moneda), M, { size: 11, bold: true, color: ORANGE, right: colR });
  d.y -= 16;

  // ── Plan de pagos ──
  if (pagos.length > 0) {
    d.heading("Plan de pagos");
    d.text("Depósito", M, { size: 8, bold: true });
    d.text("Fecha máxima", M + 220, { size: 8, bold: true });
    d.text("Valor", M, { size: 8, bold: true, right: colR });
    d.y -= 4; d.hr();
    for (const p of pagos) {
      d.ensure(14);
      d.text(p.plazo, M, { size: 8 });
      d.text(p.fechaMax, M + 220, { size: 8 });
      d.text(fmtMoney(p.valor, moneda), M, { size: 8, right: colR });
      d.y -= 13;
    }
  }

  // ── Condiciones ──
  if (r?.snapshots.condiciones) {
    d.heading("Condiciones");
    d.wrap(stripHtml(r.snapshots.condiciones), M, colR - M, 8);
  }

  // ── Footer en todas las páginas ──
  const pages = d.doc.getPages();
  const footer = `${opts.agencia || "Turistea CRM"} · Generada el ${opts.fecha} · Sujeta a confirmación de tarifa y disponibilidad.`;
  pages.forEach((pg) => {
    pg.drawText(safeText(footer), { x: M, y: 24, size: 7, font: d.font, color: GRAY });
  });

  const bytes = await d.toBuffer();
  return Buffer.from(bytes);
}
