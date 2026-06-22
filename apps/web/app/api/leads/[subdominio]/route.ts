import { NextRequest, NextResponse } from "next/server";
import { crearLeadPublico, type LeadUtms } from "@/lib/db/leads";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Claves de tracking que aceptamos. Cualquier otra se ignora — evita que el
// emisor envíe basura arbitraria al jsonb.
const UTM_KEYS: (keyof LeadUtms)[] = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "msclkid", "ttclid",
];

function pickUtms(body: Record<string, unknown>): LeadUtms | null {
  const out: LeadUtms = {};
  // Aceptamos tanto utms.utm_source como utm_source en raíz, para que el sitio
  // pueda mandar como objeto anidado o aplanado.
  const nested = (body.utms && typeof body.utms === "object" ? body.utms : {}) as Record<string, unknown>;
  for (const k of UTM_KEYS) {
    const v = (nested[k] ?? body[k]);
    if (v != null && String(v).trim()) out[k] = String(v).slice(0, 200);
  }
  return Object.keys(out).length ? out : null;
}

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

  // Honeypot anti-spam: un campo oculto que los humanos no completan. Si viene
  // con valor, es un bot — respondemos 200 sin crear nada (no le damos señal).
  const str = (v: unknown) => (v == null ? "" : String(v)).trim();
  if (str(body.website) || str(body._gotcha)) {
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS });
  }

  const nombre = str(body.nombre).slice(0, 200);
  const email = str(body.email).slice(0, 200);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!nombre || !email) {
    return NextResponse.json({ ok: false, error: "nombre y email son obligatorios" }, { status: 400, headers: CORS });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "email inválido" }, { status: 400, headers: CORS });
  }

  // pipeline / etapa / asesor aceptan UUID o nombre. Aliases para comodidad
  // del integrador: pipeline=embudo, asesor=asignado=owner.
  const pickStr = (...vals: unknown[]) => {
    for (const v of vals) { const s = str(v); if (s) return s; }
    return "";
  };
  const pickNum = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const camposCustom =
    body.campos_custom && typeof body.campos_custom === "object" && !Array.isArray(body.campos_custom)
      ? (body.campos_custom as Record<string, unknown>)
      : null;

  const res = await crearLeadPublico(subdominio, {
    nombre,
    email,
    telefono: str(body.telefono).slice(0, 40) || null,
    empresa: str(body.empresa).slice(0, 200) || null,
    mensaje: str(body.mensaje).slice(0, 5000) || null,

    // Routing — aceptan UUID o nombre
    pipeline: pickStr(body.pipeline, body.pipeline_id, body.embudo).slice(0, 100) || null,
    etapa: pickStr(body.etapa, body.etapa_id, body.stage).slice(0, 100) || null,
    asesor: pickStr(body.asesor, body.asignado, body.owner, body.asignado_id).slice(0, 200) || null,

    // Comerciales
    valor: pickNum(body.valor ?? body.value),
    moneda: str(body.moneda ?? body.currency).slice(0, 8) || null,
    probabilidad: pickNum(body.probabilidad ?? body.probability),
    fecha_cierre: str(body.fecha_cierre ?? body.expected_close_date).slice(0, 10) || null,

    campos_custom: camposCustom,
    formulario: str(body.formulario).slice(0, 80) || null,
    utms: pickUtms(body),
    origen_url: str(body.origen_url).slice(0, 500) || null,
    referrer: str(body.referrer).slice(0, 500) || null,
    landing: str(body.landing).slice(0, 500) || null,
  });

  return NextResponse.json(res, { status: res.ok ? 200 : 400, headers: CORS });
}
