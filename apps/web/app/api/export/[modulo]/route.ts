import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";
import { rowsToCsv } from "@/lib/export/build";
import { cargarParaExportar, type ModuloExport } from "@/lib/export/seleccion";

const MODULOS: ModuloExport[] = ["empresas", "contactos", "oportunidades", "productos"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: Promise<{ modulo: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { modulo } = await params;
  if (!MODULOS.includes(modulo as ModuloExport)) {
    return NextResponse.json({ error: "Módulo inválido" }, { status: 400 });
  }

  let body: { ids?: unknown; formato?: unknown; cols?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string" && UUID_RE.test(x)) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Sin registros seleccionados" }, { status: 400 });
  if (ids.length > 5000) return NextResponse.json({ error: "Máximo 5000 registros por exportación" }, { status: 400 });

  // Columnas visibles a exportar (opcional). Si no llegan, se exportan todas.
  const cols = Array.isArray(body.cols)
    ? body.cols.filter((x): x is string => typeof x === "string" && /^[a-z_]+$/.test(x))
    : undefined;

  const formato = body.formato === "xlsx" ? "xlsx" : "csv";
  const rows = await cargarParaExportar(modulo as ModuloExport, ids, cols);

  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `${modulo}-${fecha}.${formato}`;

  if (formato === "csv") {
    // BOM para que Excel abra UTF-8 con acentos correctamente.
    const csv = "﻿" + rowsToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // XLSX
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, modulo.slice(0, 31));
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
