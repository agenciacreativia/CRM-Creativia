import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type LeadUtms = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  // Identificadores de clic de plataformas publicitarias.
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
};

/**
 * Estilo Pipedrive: cada campo de routing acepta UUID o nombre exacto.
 * Si el valor parece UUID, lo validamos contra el tenant. Si es texto, lo
 * buscamos por nombre/etiqueta (case-insensitive). En ambos casos, IDs que
 * no pertenezcan al tenant del subdominio quedan en null (silencioso) —
 * el endpoint es público y no queremos filtrar info cross-tenant.
 */
export type LeadPasajero = {
  tipo?: "adulto" | "nino" | "bebe" | string;
  nombre: string;
  documento?: string | null;
  fecha_nacimiento?: string | null; // YYYY-MM-DD
  email?: string | null;
  telefono?: string | null;
};

export type LeadHabitacion = {
  tipo: "sencilla" | "doble" | "triple" | string;
  pasajeros?: LeadPasajero[];
};

export type LeadInput = {
  // Identidad del lead
  nombre: string;
  email: string;
  telefono?: string | null;
  empresa?: string | null;
  nit?: string | null;
  mensaje?: string | null;

  // Habitaciones (con pasajeros asociados) y/o pasajeros sueltos
  habitaciones?: LeadHabitacion[] | null;
  pasajeros?: LeadPasajero[] | null;

  // Routing (ID o nombre, cualquiera funciona)
  pipeline?: string | null;     // nombre del pipeline o UUID
  etapa?: string | null;        // nombre de la etapa o UUID
  asesor?: string | null;       // UUID, email o nombre del usuario

  // Comerciales
  valor?: number | null;
  moneda?: string | null;       // USD|ARS|EUR|MXN|COP|CLP|PEN|BRL
  probabilidad?: number | null; // 0-100
  fecha_cierre?: string | null; // YYYY-MM-DD

  // Custom fields: clave (snake_case del campo) o etiqueta (label visible)
  // → valor primitivo. Solo se guardan los que existen en el catálogo del tenant.
  campos_custom?: Record<string, unknown> | null;

  // Trazabilidad (analytics)
  formulario?: string | null;
  utms?: LeadUtms | null;
  origen_url?: string | null;
  referrer?: string | null;
  landing?: string | null;
};

export type LeadResult = {
  ok: boolean;
  error?: string;
  oportunidad_id?: string;
  contacto_id?: string;
  warnings?: string[]; // p.ej. "pipeline 'X' no existe, se usó el default"
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONEDAS = new Set(["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"]);
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** True si el string parece UUID. */
const isUuid = (s: string) => UUID_RE.test(s);

// ── Resolvers ──────────────────────────────────────────────────────────────

async function resolvePipeline(
  admin: ReturnType<typeof createAdminSupabase>,
  tid: string,
  raw: string | null | undefined,
): Promise<{ id: string } | null> {
  const s = (raw ?? "").trim();
  if (s) {
    if (isUuid(s)) {
      const { data } = await admin.from("pipeline").select("id").eq("id", s).eq("tenant_id", tid).maybeSingle();
      if (data) return data as { id: string };
    } else {
      const { data } = await admin.from("pipeline").select("id").eq("tenant_id", tid).ilike("nombre", s).maybeSingle();
      if (data) return data as { id: string };
    }
  }
  // Fallback: es_default → primero por creado_en
  const { data: def } = await admin.from("pipeline").select("id").eq("tenant_id", tid).eq("es_default", true).maybeSingle();
  if (def) return def as { id: string };
  const { data: first } = await admin
    .from("pipeline").select("id").eq("tenant_id", tid).order("creado_en", { ascending: true }).limit(1).maybeSingle();
  return (first as { id: string } | null) ?? null;
}

async function resolveEtapa(
  admin: ReturnType<typeof createAdminSupabase>,
  pipelineId: string,
  raw: string | null | undefined,
): Promise<{ id: string } | null> {
  const s = (raw ?? "").trim();
  if (s) {
    if (isUuid(s)) {
      const { data } = await admin
        .from("etapa_pipeline").select("id").eq("id", s).eq("pipeline_id", pipelineId).maybeSingle();
      if (data) return data as { id: string };
    } else {
      const { data } = await admin
        .from("etapa_pipeline").select("id").eq("pipeline_id", pipelineId).ilike("nombre", s).maybeSingle();
      if (data) return data as { id: string };
    }
  }
  // Fallback: primera etapa del pipeline
  const { data } = await admin
    .from("etapa_pipeline").select("id").eq("pipeline_id", pipelineId).order("orden", { ascending: true }).limit(1).maybeSingle();
  return (data as { id: string } | null) ?? null;
}

async function resolveAsesor(
  admin: ReturnType<typeof createAdminSupabase>,
  tid: string,
  raw: string | null | undefined,
): Promise<{ id: string } | null> {
  const s = (raw ?? "").trim();
  if (!s) return null;
  // UUID directo
  if (isUuid(s)) {
    const { data } = await admin
      .from("usuario").select("id").eq("id", s).eq("tenant_id", tid).eq("activo", true).maybeSingle();
    return (data as { id: string } | null) ?? null;
  }
  // Email exacto
  if (s.includes("@")) {
    const { data } = await admin
      .from("usuario").select("id").eq("tenant_id", tid).eq("activo", true).ilike("email", s).maybeSingle();
    if (data) return data as { id: string };
  }
  // Nombre exacto
  const { data } = await admin
    .from("usuario").select("id").eq("tenant_id", tid).eq("activo", true).ilike("nombre", s).maybeSingle();
  return (data as { id: string } | null) ?? null;
}

/**
 * Solo deja pasar valores cuyas claves existen en el catálogo de campos
 * personalizados del tenant para tipo_entidad='oportunidad'. Acepta clave
 * (snake_case) o etiqueta visible — las normaliza a la clave canónica.
 */
async function resolveCamposCustom(
  admin: ReturnType<typeof createAdminSupabase>,
  tid: string,
  raw: Record<string, unknown> | null | undefined,
  warnings: string[],
): Promise<Record<string, unknown>> {
  if (!raw || typeof raw !== "object") return {};
  const { data: defs } = await admin
    .from("campo_personalizado")
    .select("clave, etiqueta, tipo")
    .eq("tenant_id", tid)
    .eq("tipo_entidad", "oportunidad");
  const catalog = new Map<string, { clave: string; tipo: string }>();
  for (const d of defs ?? []) {
    catalog.set(d.clave.toLowerCase(), { clave: d.clave, tipo: d.tipo });
    catalog.set(d.etiqueta.toLowerCase(), { clave: d.clave, tipo: d.tipo });
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const match = catalog.get(k.toLowerCase());
    if (!match) {
      warnings.push(`campo_custom "${k}" no existe en el catálogo, ignorado`);
      continue;
    }
    // Coerción mínima por tipo. Si falla, se ignora con warning — preferimos
    // perder un campo que reventar todo el lead.
    out[match.clave] = coerceCustom(v, match.tipo, k, warnings);
  }
  // Dropear claves cuyo valor quedó undefined
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

function coerceCustom(v: unknown, tipo: string, originalKey: string, warnings: string[]): unknown {
  if (v == null) return null;
  switch (tipo) {
    case "numero":
    case "moneda": {
      const n = Number(String(v).replace(/[^\d.\-]/g, ""));
      if (!Number.isFinite(n)) { warnings.push(`campo_custom "${originalKey}" no es número`); return undefined; }
      return n;
    }
    case "checkbox":
      return v === true || v === "true" || v === 1 || v === "1" || v === "si" || v === "yes";
    case "fecha": {
      const s = String(v).trim();
      if (!FECHA_ISO.test(s)) { warnings.push(`campo_custom "${originalKey}" no es fecha YYYY-MM-DD`); return undefined; }
      return s;
    }
    case "seleccion":
    case "texto":
    case "textarea":
    default:
      return String(v).slice(0, 2000);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

/**
 * Create a lead from a public web form (no auth). Resolves the tenant by
 * subdomain, finds/creates the company, then creates a contact + opportunity.
 * The plan-cap trigger applies automatically (over-cap rows go to the waitlist).
 */
export async function crearLeadPublico(subdominio: string, input: LeadInput): Promise<LeadResult> {
  const admin = createAdminSupabase();
  const warnings: string[] = [];

  const { data: tenant } = await admin
    .from("tenant")
    .select("id, estado")
    .eq("subdominio", subdominio)
    .maybeSingle();
  if (!tenant || tenant.estado !== "activo") return { ok: false, error: "Agencia no encontrada" };
  const tid = tenant.id as string;

  // Company: reuse if matching, else create (default bucket "Leads web").
  // Si viene `nit`, lo guardamos al crear; en empresas existentes lo updateamos
  // sólo si estaba vacío (no pisamos valor manual del CRM).
  const empName = input.empresa?.trim() || "Leads web";
  const nit = input.nit?.trim().slice(0, 60) || null;
  let empresaId: string | null = null;
  const { data: emp } = await admin
    .from("empresa").select("id, nit").eq("tenant_id", tid).ilike("nombre", empName).maybeSingle();
  if (emp) {
    empresaId = emp.id as string;
    if (nit && !emp.nit) {
      await admin.from("empresa").update({ nit }).eq("id", empresaId);
    }
  } else {
    const { data: created, error } = await admin
      .from("empresa")
      .insert({ tenant_id: tid, nombre: empName, nit, estado_empresa: "prospecto", origen: "web" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    empresaId = created.id as string;
  }

  // Contact
  const { data: cont, error: cErr } = await admin
    .from("contacto")
    .insert({ tenant_id: tid, empresa_id: empresaId, nombre: input.nombre, email: input.email, telefono: input.telefono ?? null })
    .select("id")
    .single();
  if (cErr) return { ok: false, error: cErr.message };

  // Routing
  const pipe = await resolvePipeline(admin, tid, input.pipeline);
  if (!pipe) {
    return { ok: true, contacto_id: cont.id, warnings: ["tenant sin pipelines configurados, oportunidad no creada"] };
  }
  if (input.pipeline && (input.pipeline ?? "").trim()) {
    // Si el usuario pidió un pipeline específico y no se encontró, avisamos.
    // (no podemos detectar fallback sin re-query — barato dejar al cliente
    // confiar en pipeline_id de la respuesta).
  }
  const etapa = await resolveEtapa(admin, pipe.id, input.etapa);
  if (!etapa) return { ok: true, contacto_id: cont.id, warnings: ["pipeline sin etapas, oportunidad no creada"] };

  const asesor = await resolveAsesor(admin, tid, input.asesor);
  if (input.asesor && !asesor) warnings.push(`asesor "${input.asesor}" no se pudo resolver`);

  // Espejar UTMs como campos_custom para que aparezcan en la UI de oportunidad
  // sin necesidad de tocar el sitio. El sitio sigue enviando `utms: {...}` (no
  // cambia). Si el tenant creó campos con estas claves canónicas, se llenan
  // automáticamente. Si no, el utms jsonb sigue guardado en oportunidad.utms.
  const utmsAsCustom: Record<string, unknown> = {};
  if (input.utms) {
    const map: Record<keyof LeadUtms, string> = {
      utm_source: "fuente",
      utm_medium: "medio",
      utm_campaign: "campania",
      utm_term: "termino",
      utm_content: "contenido",
      gclid: "id_lead_ad",
      fbclid: "id_lead_ad",
      msclkid: "id_lead_ad",
      ttclid: "id_lead_ad",
    };
    for (const [utmKey, customKey] of Object.entries(map) as [keyof LeadUtms, string][]) {
      const v = input.utms[utmKey];
      if (v && !utmsAsCustom[customKey]) utmsAsCustom[customKey] = v;
    }
  }
  // El campos_custom explícito del payload tiene prioridad sobre el espejo
  // de UTMs (por si el integrador quiere setear "fuente" manualmente).
  const camposCustomInput = { ...utmsAsCustom, ...(input.campos_custom ?? {}) };
  const camposCustom = await resolveCamposCustom(admin, tid, camposCustomInput, warnings);

  // Validación de campos comerciales
  const moneda = input.moneda && MONEDAS.has(input.moneda.toUpperCase()) ? input.moneda.toUpperCase() : "USD";
  if (input.moneda && !MONEDAS.has(input.moneda.toUpperCase())) {
    warnings.push(`moneda "${input.moneda}" no soportada, se usó USD`);
  }
  const valor = typeof input.valor === "number" && Number.isFinite(input.valor) && input.valor >= 0 ? input.valor : null;
  const prob = typeof input.probabilidad === "number" && input.probabilidad >= 0 && input.probabilidad <= 100
    ? Math.round(input.probabilidad)
    : null;
  const fechaCierre = input.fecha_cierre && FECHA_ISO.test(input.fecha_cierre) ? input.fecha_cierre : null;
  if (input.fecha_cierre && !fechaCierre) warnings.push(`fecha_cierre "${input.fecha_cierre}" no es YYYY-MM-DD`);

  const utmsObj = input.utms && Object.values(input.utms).some((v) => v) ? input.utms : null;

  const { data: op, error: oErr } = await admin
    .from("oportunidad")
    .insert({
      tenant_id: tid,
      nombre: `Lead web: ${input.nombre}`,
      empresa_id: empresaId,
      contacto_id: cont.id,
      pipeline_id: pipe.id,
      etapa_id: etapa.id,
      asignado_id: asesor?.id ?? null,
      estado: "activo",
      moneda,
      valor,
      probabilidad_cierre: prob,
      fecha_esperada_cierre: fechaCierre,
      descripcion: input.mensaje ?? null,
      campos_custom: Object.keys(camposCustom).length ? camposCustom : {},
      utms: utmsObj,
      origen_url: input.origen_url ?? null,
      referrer: input.referrer ?? null,
      landing: input.landing ?? null,
      formulario: input.formulario?.trim() || null,
    })
    .select("id")
    .single();
  if (oErr) return { ok: false, error: oErr.message, contacto_id: cont.id };

  // Habitaciones + pasajeros. Si el sitio mandó `habitaciones[]`, cada una se
  // crea con sus pasajeros vinculados (FK habitacion_id). Pasajeros sueltos
  // (input.pasajeros) se crean sin habitacion.
  const oportunidadId = op?.id as string | undefined;
  const TIPOS_HAB = new Set(["sencilla", "doble", "triple"]);
  const TIPOS_PAX = new Set(["adulto", "nino", "bebe"]);
  const normalizaPax = (p: LeadPasajero) => {
    const tipoRaw = (p.tipo ?? "adulto").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const tipo = TIPOS_PAX.has(tipoRaw) ? tipoRaw : tipoRaw === "niño" || tipoRaw === "menor" ? "nino" : tipoRaw === "infante" ? "bebe" : "adulto";
    return {
      tenant_id: tid,
      oportunidad_id: oportunidadId,
      nombre: String(p.nombre || "").trim().slice(0, 200),
      documento: p.documento?.toString().slice(0, 60) || null,
      fecha_nacimiento: p.fecha_nacimiento && FECHA_ISO.test(p.fecha_nacimiento) ? p.fecha_nacimiento : null,
      tipo,
      email: p.email?.toString().slice(0, 200) || null,
      telefono: p.telefono?.toString().slice(0, 40) || null,
    };
  };

  if (oportunidadId && Array.isArray(input.habitaciones) && input.habitaciones.length) {
    for (let i = 0; i < input.habitaciones.length; i++) {
      const h = input.habitaciones[i];
      const tipoHab = TIPOS_HAB.has(String(h.tipo).toLowerCase()) ? String(h.tipo).toLowerCase() : "doble";
      const { data: hab } = await admin
        .from("habitacion")
        .insert({ tenant_id: tid, oportunidad_id: oportunidadId, tipo: tipoHab, orden: i + 1 })
        .select("id")
        .single();
      const habId = hab?.id as string | undefined;
      const pax = (h.pasajeros ?? []).filter((p) => p?.nombre?.toString().trim());
      if (habId && pax.length) {
        const rows = pax.map((p) => ({ ...normalizaPax(p), habitacion_id: habId }));
        const { error: paxErr } = await admin.from("pasajero").insert(rows);
        if (paxErr) warnings.push(`pasajeros de habitación ${i + 1}: ${paxErr.message}`);
      }
    }
  }
  // Pasajeros sueltos (sin habitación)
  if (oportunidadId && Array.isArray(input.pasajeros) && input.pasajeros.length) {
    const rows = input.pasajeros.filter((p) => p?.nombre?.toString().trim()).map(normalizaPax);
    if (rows.length) {
      const { error: paxErr } = await admin.from("pasajero").insert(rows);
      if (paxErr) warnings.push(`pasajeros sueltos: ${paxErr.message}`);
    }
  }

  return {
    ok: true,
    oportunidad_id: oportunidadId,
    contacto_id: cont.id,
    warnings: warnings.length ? warnings : undefined,
  };
}
