import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  type ParsedEmpresa,
  type ParsedContacto,
  type ParsedOportunidad,
  mapEstado,
} from "./parse";

export type ImportPreview = {
  empresas: { total: number; sample: { nombre: string; ciudad: string | null }[] };
  contactos: {
    total: number;
    sample: { nombre: string; email: string | null; empresa_match: string | null }[];
    warnings: string[];
  };
  oportunidades: {
    total: number;
    sample: {
      nombre: string;
      estado: string;
      pipeline: string | null;
      etapa: string | null;
      asignado: string | null;
    }[];
    warnings: string[];
  };
  pipelines_to_create: { nombre: string; etapas: string[] }[];
  duplicates: { empresas: string[] };
  asesores_disponibles: { id: string; nombre: string }[];
};

const SAMPLE_SIZE = 5;

/**
 * Generates the preview shown to the admin before committing the import.
 * Reads existing tenant data (empresas, pipelines, usuarios) to detect
 * conflicts, matches, and missing references.
 */
export async function buildPreview(args: {
  empresas: ParsedEmpresa[];
  contactos: ParsedContacto[];
  oportunidades: ParsedOportunidad[];
}): Promise<ImportPreview> {
  const supabase = await createServerSupabase();

  const [
    { data: existingEmpresas },
    { data: existingPipelines },
    { data: existingEtapas },
    { data: existingUsuarios },
  ] = await Promise.all([
    supabase.from("empresa").select("id, nombre, email"),
    supabase.from("pipeline").select("id, nombre"),
    supabase.from("etapa_pipeline").select("id, nombre, pipeline_id"),
    supabase.from("usuario").select("id, nombre").eq("activo", true),
  ]);

  const empresasByName = new Map((existingEmpresas ?? []).map((e) => [e.nombre.toLowerCase(), e]));
  const empresasByEmail = new Map(
    (existingEmpresas ?? [])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase(), e]),
  );
  const pipelinesByName = new Map((existingPipelines ?? []).map((p) => [p.nombre.toLowerCase(), p]));
  const usuariosByName = new Map(
    (existingUsuarios ?? []).map((u) => [u.nombre.toLowerCase(), u]),
  );

  // Duplicates inside the incoming file
  const incomingNames = new Set<string>();
  const dupEmpresas: string[] = [];
  for (const e of args.empresas) {
    const k = e.nombre.toLowerCase();
    if (incomingNames.has(k)) dupEmpresas.push(e.nombre);
    incomingNames.add(k);
  }

  // Empresas — match against existing
  const empresasNew = args.empresas.filter((e) => !empresasByName.has(e.nombre.toLowerCase()));

  // Contactos — match email → empresa
  const contactoWarnings: string[] = [];
  const contactosSample = args.contactos.slice(0, SAMPLE_SIZE).map((c) => {
    let empresaMatch: string | null = null;
    if (c.email) {
      const match = empresasByEmail.get(c.email.toLowerCase());
      if (match) {
        empresaMatch = match.nombre;
      } else {
        const incomingMatch = args.empresas.find(
          (e) => e.email && e.email.toLowerCase() === c.email!.toLowerCase(),
        );
        if (incomingMatch) empresaMatch = incomingMatch.nombre + " (a crear)";
      }
    }
    return { nombre: c.nombre, email: c.email, empresa_match: empresaMatch };
  });
  for (const c of args.contactos) {
    if (!c.email) {
      contactoWarnings.push(`Fila ${c.rowIndex + 2}: contacto "${c.nombre}" sin email — no se podrá vincular a empresa`);
      continue;
    }
    const inExisting = empresasByEmail.has(c.email.toLowerCase());
    const inIncoming = args.empresas.some(
      (e) => e.email && e.email.toLowerCase() === c.email!.toLowerCase(),
    );
    if (!inExisting && !inIncoming) {
      contactoWarnings.push(`Fila ${c.rowIndex + 2}: contacto "${c.nombre}" (${c.email}) no matchea ninguna empresa`);
    }
  }

  // Oportunidades — sample + check pipelines/etapas + asignado
  const oportunidadWarnings: string[] = [];
  const opSample = args.oportunidades.slice(0, SAMPLE_SIZE).map((o) => {
    const owner = o.propietario
      ? usuariosByName.get(o.propietario.toLowerCase())?.nombre ?? `${o.propietario} (no asignado)`
      : "(sin propietario)";
    return {
      nombre: o.nombre,
      estado: mapEstado(o.estado_raw),
      pipeline: o.pipeline_nombre,
      etapa: o.etapa_nombre,
      asignado: owner,
    };
  });
  for (const o of args.oportunidades) {
    if (o.propietario && !usuariosByName.has(o.propietario.toLowerCase())) {
      oportunidadWarnings.push(`Fila ${o.rowIndex + 2}: propietario "${o.propietario}" no es asesor en este tenant — quedará sin asignar`);
    }
  }

  // Pipelines/etapas to create
  const pipelinesNeeded = new Map<string, Set<string>>();
  for (const o of args.oportunidades) {
    if (!o.pipeline_nombre) continue;
    const key = o.pipeline_nombre.toLowerCase();
    if (!pipelinesNeeded.has(key)) pipelinesNeeded.set(key, new Set());
    if (o.etapa_nombre) pipelinesNeeded.get(key)!.add(o.etapa_nombre);
  }
  const pipelinesToCreate: { nombre: string; etapas: string[] }[] = [];
  for (const [pipelineKey, etapas] of pipelinesNeeded) {
    const pipelineExists = pipelinesByName.has(pipelineKey);
    if (pipelineExists) {
      // check missing etapas
      const pipeline = pipelinesByName.get(pipelineKey)!;
      const existingStageNames = new Set(
        (existingEtapas ?? [])
          .filter((e) => e.pipeline_id === pipeline.id)
          .map((e) => e.nombre.toLowerCase()),
      );
      const missing = [...etapas].filter((n) => !existingStageNames.has(n.toLowerCase()));
      if (missing.length > 0) {
        pipelinesToCreate.push({
          nombre: `${pipeline.nombre} (etapas faltantes)`,
          etapas: missing,
        });
      }
    } else {
      const original = args.oportunidades.find(
        (o) => o.pipeline_nombre?.toLowerCase() === pipelineKey,
      )!.pipeline_nombre!;
      pipelinesToCreate.push({ nombre: original, etapas: [...etapas] });
    }
  }

  return {
    empresas: {
      total: empresasNew.length,
      sample: empresasNew.slice(0, SAMPLE_SIZE).map((e) => ({ nombre: e.nombre, ciudad: e.ciudad })),
    },
    contactos: {
      total: args.contactos.length,
      sample: contactosSample,
      warnings: contactoWarnings,
    },
    oportunidades: {
      total: args.oportunidades.length,
      sample: opSample,
      warnings: oportunidadWarnings,
    },
    pipelines_to_create: pipelinesToCreate,
    duplicates: { empresas: dupEmpresas },
    asesores_disponibles: (existingUsuarios ?? []).map((u) => ({ id: u.id, nombre: u.nombre })),
  };
}
