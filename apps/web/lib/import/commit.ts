import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import {
  type ParsedEmpresa,
  type ParsedContacto,
  type ParsedOportunidad,
  mapEstado,
} from "./parse";

export type CommitResult = {
  empresas_creadas: number;
  contactos_creados: number;
  oportunidades_creadas: number;
  pipelines_creados: number;
  etapas_creadas: number;
  contactos_sin_empresa: number;
  oportunidades_sin_asignado: number;
};

/**
 * Inserts the parsed data via the authenticated server client. RLS enforces
 * tenant isolation: every INSERT must include `tenant_id = current_tenant_id()`.
 *
 * Not atomic across tables (Supabase JS doesn't support BEGIN/COMMIT), but
 * each .insert() is itself atomic and the order minimizes orphan rows.
 * If something fails partway, the user can re-run — the dedupe checks
 * (by nombre/email) make the import idempotent.
 */
export async function commitImport(args: {
  empresas: ParsedEmpresa[];
  contactos: ParsedContacto[];
  oportunidades: ParsedOportunidad[];
}): Promise<CommitResult> {
  const supabase = await createServerSupabase();
  const session = await getSessionUser();
  if (!session?.tenantId || session.rol !== "admin") {
    throw new Error("Solo administradores pueden importar datos");
  }
  const tenantId = session.tenantId;

  const result: CommitResult = {
    empresas_creadas: 0,
    contactos_creados: 0,
    oportunidades_creadas: 0,
    pipelines_creados: 0,
    etapas_creadas: 0,
    contactos_sin_empresa: 0,
    oportunidades_sin_asignado: 0,
  };

  // ---------- Load reference data ----------
  const [{ data: existingEmpresas }, { data: pipelines }, { data: etapas }, { data: usuarios }, { data: motivos }] =
    await Promise.all([
      supabase.from("empresa").select("id, nombre, email"),
      supabase.from("pipeline").select("id, nombre, es_default"),
      supabase.from("etapa_pipeline").select("id, nombre, pipeline_id"),
      supabase.from("usuario").select("id, nombre").eq("activo", true),
      supabase.from("motivo_perdida").select("id, nombre"),
    ]);

  const empresasByName = new Map((existingEmpresas ?? []).map((e) => [e.nombre.toLowerCase(), e]));
  const empresasByEmail = new Map(
    (existingEmpresas ?? []).filter((e) => e.email).map((e) => [e.email!.toLowerCase(), e]),
  );
  const pipelinesByName = new Map((pipelines ?? []).map((p) => [p.nombre.toLowerCase(), p]));
  const etapasByKey = new Map(
    (etapas ?? []).map((e) => [`${e.pipeline_id}::${e.nombre.toLowerCase()}`, e]),
  );
  const usuariosByName = new Map((usuarios ?? []).map((u) => [u.nombre.toLowerCase(), u]));
  const motivoSinRegistrar = (motivos ?? []).find(
    (m) => m.nombre.toLowerCase() === "sin motivo registrado",
  );
  const defaultPipeline = (pipelines ?? []).find((p) => p.es_default) ?? (pipelines ?? [])[0];

  // ---------- 1. Empresas ----------
  const empresasToInsert = args.empresas
    .filter((e) => !empresasByName.has(e.nombre.toLowerCase()))
    .map((e) => ({
      tenant_id: tenantId,
      nombre: e.nombre,
      email: e.email,
      telefono: e.telefono,
      direccion: e.direccion,
      sitio_web: e.sitio_web,
      ciudad: e.ciudad,
      pais: e.pais,
      origen: "otro" as const,
      estado_empresa: "cliente" as const,
      creado_por: session.id,
    }));
  if (empresasToInsert.length > 0) {
    const { data, error } = await supabase
      .from("empresa")
      .insert(empresasToInsert)
      .select("id, nombre, email");
    if (error) throw new Error(`Error insertando empresas: ${error.message}`);
    result.empresas_creadas = data?.length ?? 0;
    for (const row of data ?? []) {
      empresasByName.set(row.nombre.toLowerCase(), row);
      if (row.email) empresasByEmail.set(row.email.toLowerCase(), row);
    }
  }

  // ---------- 2. Contactos ----------
  const contactosToInsert: Array<{
    tenant_id: string;
    empresa_id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    origen: string;
    creado_por: string;
  }> = [];
  for (const c of args.contactos) {
    if (!c.email) {
      result.contactos_sin_empresa++;
      continue;
    }
    const empresa = empresasByEmail.get(c.email.toLowerCase());
    if (!empresa) {
      result.contactos_sin_empresa++;
      continue;
    }
    contactosToInsert.push({
      tenant_id: tenantId,
      empresa_id: empresa.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      origen: "empresa",
      creado_por: session.id,
    });
  }
  if (contactosToInsert.length > 0) {
    const { data, error } = await supabase
      .from("contacto")
      .insert(contactosToInsert)
      .select("id, email, empresa_id");
    if (error) throw new Error(`Error insertando contactos: ${error.message}`);
    result.contactos_creados = data?.length ?? 0;
  }

  // Reload contactos for opportunity linking
  const { data: allContactos } = await supabase
    .from("contacto")
    .select("id, email, empresa_id");
  const contactoByEmpresaId = new Map<string, string>();
  for (const c of allContactos ?? []) {
    if (!contactoByEmpresaId.has(c.empresa_id)) contactoByEmpresaId.set(c.empresa_id, c.id);
  }

  // ---------- 3. Pipelines + etapas needed by oportunidades ----------
  const pipelinesNeeded = new Map<string, Set<string>>();
  for (const o of args.oportunidades) {
    const pname = o.pipeline_nombre ?? defaultPipeline?.nombre ?? "Ventas";
    const key = pname.toLowerCase();
    if (!pipelinesNeeded.has(key)) pipelinesNeeded.set(key, new Set());
    if (o.etapa_nombre) pipelinesNeeded.get(key)!.add(o.etapa_nombre);
  }

  for (const [pipelineKey, etapasNeeded] of pipelinesNeeded) {
    let pipeline = pipelinesByName.get(pipelineKey);
    if (!pipeline) {
      const originalName = args.oportunidades.find(
        (o) => (o.pipeline_nombre ?? "").toLowerCase() === pipelineKey,
      )?.pipeline_nombre ?? pipelineKey;
      const { data, error } = await supabase
        .from("pipeline")
        .insert({
          tenant_id: tenantId,
          nombre: originalName,
          es_default: false,
          creado_por: session.id,
        })
        .select("id, nombre")
        .single();
      if (error) throw new Error(`Error creando pipeline ${originalName}: ${error.message}`);
      pipeline = { id: data.id, nombre: data.nombre, es_default: false };
      pipelinesByName.set(pipelineKey, pipeline);
      result.pipelines_creados++;
    }

    // Add missing etapas. Determine max orden so new ones go at the end.
    const existingForPipeline = (etapas ?? []).filter((e) => e.pipeline_id === pipeline!.id);
    let nextOrden = existingForPipeline.length;
    for (const etapaName of etapasNeeded) {
      const k = `${pipeline.id}::${etapaName.toLowerCase()}`;
      if (etapasByKey.has(k)) continue;
      const { data, error } = await supabase
        .from("etapa_pipeline")
        .insert({
          tenant_id: tenantId,
          pipeline_id: pipeline.id,
          nombre: etapaName,
          orden: nextOrden++,
        })
        .select("id, nombre, pipeline_id")
        .single();
      if (error) throw new Error(`Error creando etapa ${etapaName}: ${error.message}`);
      etapasByKey.set(k, data);
      result.etapas_creadas++;
    }
  }

  // ---------- 4. Oportunidades ----------
  const opsToInsert: Array<Record<string, unknown>> = [];
  for (const o of args.oportunidades) {
    const empresa = empresasByName.get(o.nombre.toLowerCase());
    if (!empresa) continue; // can't link an opportunity without an empresa

    const contactoId = contactoByEmpresaId.get(empresa.id);
    if (!contactoId) continue; // need at least one contact for that empresa

    const pipelineName = (o.pipeline_nombre ?? defaultPipeline?.nombre ?? "Ventas").toLowerCase();
    const pipeline = pipelinesByName.get(pipelineName);
    if (!pipeline) continue;

    const etapaName = (o.etapa_nombre ?? "").toLowerCase();
    let etapa = etapasByKey.get(`${pipeline.id}::${etapaName}`);
    if (!etapa) {
      // fallback to first stage of the pipeline
      etapa = (etapas ?? []).find((e) => e.pipeline_id === pipeline.id);
      if (!etapa) continue;
    }

    const asignado = o.propietario
      ? usuariosByName.get(o.propietario.toLowerCase())?.id ?? null
      : null;
    if (o.propietario && !asignado) result.oportunidades_sin_asignado++;

    const estado = mapEstado(o.estado_raw);
    const row: Record<string, unknown> = {
      tenant_id: tenantId,
      empresa_id: empresa.id,
      contacto_id: contactoId,
      pipeline_id: pipeline.id,
      etapa_id: etapa.id,
      asignado_id: asignado,
      nombre: o.nombre,
      moneda: "USD",
      estado,
    };
    if (estado === "perdido" && motivoSinRegistrar) {
      row.motivo_perdida_id = motivoSinRegistrar.id;
    }
    opsToInsert.push(row);
  }
  if (opsToInsert.length > 0) {
    const { data, error } = await supabase.from("oportunidad").insert(opsToInsert).select("id");
    if (error) throw new Error(`Error insertando oportunidades: ${error.message}`);
    result.oportunidades_creadas = data?.length ?? 0;
  }

  return result;
}
