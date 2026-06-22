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
export type LeadInput = {
  // Identidad del lead
  nombre: string;
  email: string;
  telefono?: string | null;
  empresa?: string | null;
  mensaje?: string | null;

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

/**
 * Resolver dinámico de etapa+pipeline.
 *
 * El integrador puede pasar CUALQUIERA de estas combinaciones:
 *   • solo `etapa` (UUID)              → deducimos el pipeline desde la etapa
 *   • solo `etapa` (nombre único)      → buscamos en TODOS los pipelines del tenant
 *   • solo `etapa` (nombre ambiguo)    → usamos el match en el pipeline default
 *   • `pipeline` + `etapa`             → scope explícito, máxima precisión
 *   • solo `pipeline` (o nada)         → fallback al default + primera etapa
 *
 * Devolvemos { pipelineId, etapaId, warnings }.
 */
async function resolvePipelineEtapa(
  admin: ReturnType<typeof createAdminSupabase>,
  tid: string,
  pipelineRaw: string | null | undefined,
  etapaRaw: string | null | undefined,
): Promise<{ pipelineId: string | null; etapaId: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const p = (pipelineRaw ?? "").trim();
  const e = (etapaRaw ?? "").trim();

  // Caso 1: solo etapa por UUID → la etapa ya tiene pipeline_id en la BD.
  if (e && isUuid(e)) {
    const { data: et } = await admin
      .from("etapa_pipeline").select("id, pipeline_id, pipeline:pipeline_id(tenant_id)")
      .eq("id", e).maybeSingle();
    // PostgREST devuelve la relación como array; tomamos el primero.
    const etRow = et as { id: string; pipeline_id: string; pipeline: { tenant_id: string }[] | { tenant_id: string } | null } | null;
    const pipeRel = Array.isArray(etRow?.pipeline) ? etRow?.pipeline[0] : etRow?.pipeline;
    if (etRow && pipeRel?.tenant_id === tid) {
      return { pipelineId: etRow.pipeline_id, etapaId: etRow.id, warnings };
    }
    warnings.push(`etapa_id "${e}" no pertenece al tenant`);
  }

  // Resolver pipeline (lo necesitamos para los demás casos).
  let pipelineId: string | null = null;
  if (p) {
    if (isUuid(p)) {
      const { data } = await admin
        .from("pipeline").select("id").eq("id", p).eq("tenant_id", tid).maybeSingle();
      if (data) pipelineId = data.id as string;
      else warnings.push(`pipeline_id "${p}" no encontrado en el tenant`);
    } else {
      const { data } = await admin
        .from("pipeline").select("id").eq("tenant_id", tid).ilike("nombre", p).maybeSingle();
      if (data) pipelineId = data.id as string;
      else warnings.push(`pipeline "${p}" no encontrado`);
    }
  }

  // Caso 2: etapa por NOMBRE sin pipeline → buscar en TODOS los pipelines del tenant.
  if (e && !isUuid(e) && !pipelineId) {
    const { data: matches } = await admin
      .from("etapa_pipeline")
      .select("id, pipeline_id, pipeline:pipeline_id!inner(tenant_id, es_default)")
      .ilike("nombre", e)
      .eq("pipeline.tenant_id", tid);
    type Row = { id: string; pipeline_id: string; pipeline: { es_default: boolean }[] | { es_default: boolean } | null };
    const rows = ((matches ?? []) as Row[]).map((r) => ({
      id: r.id,
      pipeline_id: r.pipeline_id,
      es_default: (Array.isArray(r.pipeline) ? r.pipeline[0]?.es_default : r.pipeline?.es_default) ?? false,
    }));
    if (rows.length === 1) {
      return { pipelineId: rows[0].pipeline_id, etapaId: rows[0].id, warnings };
    }
    if (rows.length > 1) {
      const pick = rows.find((r) => r.es_default) ?? rows[0];
      warnings.push(`etapa "${e}" existe en ${rows.length} pipelines; se usó el del pipeline default`);
      return { pipelineId: pick.pipeline_id, etapaId: pick.id, warnings };
    }
    warnings.push(`etapa "${e}" no encontrada en ningún pipeline`);
  }

  // Fallback de pipeline si todavía no se resolvió.
  if (!pipelineId) {
    const { data: def } = await admin.from("pipeline").select("id").eq("tenant_id", tid).eq("es_default", true).maybeSingle();
    if (def) pipelineId = def.id as string;
    else {
      const { data: first } = await admin
        .from("pipeline").select("id").eq("tenant_id", tid).order("creado_en", { ascending: true }).limit(1).maybeSingle();
      if (first) pipelineId = first.id as string;
    }
  }
  if (!pipelineId) return { pipelineId: null, etapaId: null, warnings };

  // Caso 3: con pipeline conocido, resolver la etapa específica dentro de él.
  let etapaId: string | null = null;
  if (e) {
    const col = isUuid(e) ? "id" : "nombre";
    const q = admin.from("etapa_pipeline").select("id").eq("pipeline_id", pipelineId);
    const { data } = await (isUuid(e) ? q.eq(col, e) : q.ilike(col, e)).maybeSingle();
    if (data) etapaId = data.id as string;
    else warnings.push(`etapa "${e}" no encontrada en el pipeline; se usó la primera`);
  }
  // Fallback: primera etapa del pipeline.
  if (!etapaId) {
    const { data } = await admin
      .from("etapa_pipeline").select("id").eq("pipeline_id", pipelineId).order("orden", { ascending: true }).limit(1).maybeSingle();
    if (data) etapaId = data.id as string;
  }
  return { pipelineId, etapaId, warnings };
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
  const empName = input.empresa?.trim() || "Leads web";
  let empresaId: string | null = null;
  const { data: emp } = await admin.from("empresa").select("id").eq("tenant_id", tid).ilike("nombre", empName).maybeSingle();
  if (emp) empresaId = emp.id as string;
  else {
    const { data: created, error } = await admin
      .from("empresa")
      .insert({ tenant_id: tid, nombre: empName, estado_empresa: "prospecto", origen: "web" })
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

  // Routing dinámico — etapa puede traer su propio pipeline.
  const routing = await resolvePipelineEtapa(admin, tid, input.pipeline, input.etapa);
  warnings.push(...routing.warnings);
  if (!routing.pipelineId) {
    return { ok: true, contacto_id: cont.id, warnings: [...warnings, "tenant sin pipelines configurados, oportunidad no creada"] };
  }
  if (!routing.etapaId) {
    return { ok: true, contacto_id: cont.id, warnings: [...warnings, "pipeline sin etapas, oportunidad no creada"] };
  }

  const asesor = await resolveAsesor(admin, tid, input.asesor);
  if (input.asesor && !asesor) warnings.push(`asesor "${input.asesor}" no se pudo resolver`);

  const camposCustom = await resolveCamposCustom(admin, tid, input.campos_custom, warnings);

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
      pipeline_id: routing.pipelineId,
      etapa_id: routing.etapaId,
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

  return {
    ok: true,
    oportunidad_id: op?.id,
    contacto_id: cont.id,
    warnings: warnings.length ? warnings : undefined,
  };
}
