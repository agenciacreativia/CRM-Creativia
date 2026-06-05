import { NextRequest, NextResponse } from "next/server";
import { crearLeadPublico } from "@/lib/db/leads";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ subdominio: string }> }) {
  const { subdominio } = await params;

  let body: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      body = await req.json();
    } else {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400, headers: CORS });
  }

  const str = (v: unknown) => (v == null ? "" : String(v)).trim();
  const nombre = str(body.nombre);
  const email = str(body.email);
  if (!nombre || !email) {
    return NextResponse.json({ ok: false, error: "nombre y email son obligatorios" }, { status: 400, headers: CORS });
  }

  const res = await crearLeadPublico(subdominio, {
    nombre,
    email,
    telefono: str(body.telefono) || null,
    empresa: str(body.empresa) || null,
    mensaje: str(body.mensaje) || null,
  });

  return NextResponse.json(res, { status: res.ok ? 200 : 400, headers: CORS });
}
