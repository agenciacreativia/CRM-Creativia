"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  patchOportunidad,
  patchContacto,
  patchEmpresa,
  moveOportunidadToEtapa,
  logCambio,
} from "@/lib/db/mutations";

export type SaveResult = { ok: boolean; error?: string };

const num = (v: string) => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: string) => (v.trim() === "" ? null : v.trim());
const required = (label: string) => (v: string) => {
  const t = v.trim();
  if (!t) throw new Error(`${label} es requerido`);
  return t;
};
const email = (v: string) => {
  const t = v.trim();
  if (!t) return null;
  // Validación simple — coincide con z.string().email() del resto del codebase.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw new Error("Email inválido");
  return t;
};

type FieldDef = { coerce: (v: string) => unknown; label: string };

/* ---------------- diff helpers ---------------- */

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(vacío)";
  return String(v);
}

async function prevValue(table: string, id: string, field: string): Promise<unknown> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from(table).select(field).eq("id", id).maybeSingle();
  if (error) {
    // Best-effort: si la query falla devolvemos null y se loguea como "(vacío) → X"
    // en vez de tirar — para no romper el flujo de save que ya pasó la validación.
    console.error(`[inline-edit] prevValue(${table}, ${field}):`, error.message);
    return null;
  }
  return data ? (data as unknown as Record<string, unknown>)[field] ?? null : null;
}

async function usuarioNombre(id: unknown): Promise<string> {
  if (!id || typeof id !== "string") return "Sin asignar";
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("usuario").select("nombre").eq("id", id).maybeSingle();
  if (error) {
    console.error("[inline-edit] usuarioNombre:", error.message);
    return "Sin asignar";
  }
  return (data as { nombre?: string } | null)?.nombre ?? "Sin asignar";
}

async function buildDesc(field: string, label: string, prev: unknown, next: unknown): Promise<string> {
  if (field === "asignado_id") {
    return `Editó ${label}: ${await usuarioNombre(prev)} → ${await usuarioNombre(next)}`;
  }
  return `Editó ${label}: ${fmtVal(prev)} → ${fmtVal(next)}`;
}

/* ---------------- field maps ---------------- */

const OPP_FIELDS: Record<string, FieldDef> = {
  nombre: { coerce: required("Nombre"), label: "Nombre" },
  valor: { coerce: num, label: "Valor" },
  probabilidad_cierre: {
    coerce: (v) => {
      const n = num(v);
      return n === null ? null : Math.max(0, Math.min(100, Math.round(n)));
    },
    label: "Probabilidad",
  },
  fecha_esperada_cierre: { coerce: str, label: "Cierre esperado" },
  descripcion: { coerce: str, label: "Descripción" },
  asignado_id: { coerce: str, label: "Asignado" },
  moneda: {
    coerce: (v) => {
      // Validar que el valor sea una de las monedas permitidas.
      const allowed = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU"] as const;
      const t = v.trim().toUpperCase();
      if (!t) return null;
      if (!(allowed as readonly string[]).includes(t)) {
        throw new Error("Moneda inválida");
      }
      return t;
    },
    label: "Moneda",
  },
  estrategia: { coerce: str, label: "Estrategia" },
};

const CONTACTO_FIELDS: Record<string, FieldDef> = {
  nombre: { coerce: required("Nombre"), label: "Nombre" },
  cargo: { coerce: str, label: "Cargo" },
  email: { coerce: email, label: "Email" },
  telefono: { coerce: str, label: "Teléfono" },
  telefono_whatsapp: { coerce: str, label: "WhatsApp" },
};

const EMPRESA_FIELDS: Record<string, FieldDef> = {
  nombre: { coerce: required("Nombre"), label: "Nombre" },
  email: { coerce: email, label: "Email" },
  telefono: { coerce: str, label: "Teléfono" },
  ciudad: { coerce: str, label: "Ciudad" },
  pais: { coerce: str, label: "País" },
  sitio_web: { coerce: str, label: "Sitio web" },
  estado_empresa: {
    coerce: (v) => {
      // Validar que el valor sea uno de los enum permitidos para estado_empresa.
      const allowed = ["prospecto", "cliente", "inactivo"] as const;
      const t = v.trim();
      if (!(allowed as readonly string[]).includes(t)) {
        throw new Error("Estado inválido");
      }
      return t;
    },
    label: "Estado",
  },
};

/* ---------------- field saves ---------------- */

export async function saveOportunidadField(id: string, field: string, value: string): Promise<SaveResult> {
  const def = OPP_FIELDS[field];
  if (!def) return { ok: false, error: "Campo no editable" };
  try {
    const next = def.coerce(value);
    const prev = await prevValue("oportunidad", id, field);
    await patchOportunidad(id, { [field]: next });
    await logCambio("oportunidad", id, await buildDesc(field, def.label, prev, next));
    revalidatePath(`/oportunidades/${id}`);
    revalidatePath("/oportunidades");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function saveContactoField(id: string, field: string, value: string): Promise<SaveResult> {
  const def = CONTACTO_FIELDS[field];
  if (!def) return { ok: false, error: "Campo no editable" };
  try {
    const next = def.coerce(value);
    const prev = await prevValue("contacto", id, field);
    await patchContacto(id, { [field]: next });
    await logCambio("contacto", id, await buildDesc(field, def.label, prev, next));
    revalidatePath(`/contactos/${id}`);
    revalidatePath("/contactos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function saveEmpresaField(id: string, field: string, value: string): Promise<SaveResult> {
  const def = EMPRESA_FIELDS[field];
  if (!def) return { ok: false, error: "Campo no editable" };
  try {
    const next = def.coerce(value);
    const prev = await prevValue("empresa", id, field);
    await patchEmpresa(id, { [field]: next });
    await logCambio("empresa", id, await buildDesc(field, def.label, prev, next));
    revalidatePath(`/empresas/${id}`);
    revalidatePath("/empresas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/* ---------------- custom fields ---------------- */
/* The client passes a ready-made `descripcion` (e.g. "Editó Medio: A → B"). */

export async function saveOportunidadCampos(id: string, campos: Record<string, unknown>, descripcion?: string): Promise<SaveResult> {
  try {
    await patchOportunidad(id, { campos_custom: campos });
    await logCambio("oportunidad", id, descripcion ?? "Editó un campo personalizado");
    revalidatePath(`/oportunidades/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function saveContactoCampos(id: string, campos: Record<string, unknown>, descripcion?: string): Promise<SaveResult> {
  try {
    await patchContacto(id, { campos_custom: campos });
    await logCambio("contacto", id, descripcion ?? "Editó un campo personalizado");
    revalidatePath(`/contactos/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function saveEmpresaCampos(id: string, campos: Record<string, unknown>, descripcion?: string): Promise<SaveResult> {
  try {
    await patchEmpresa(id, { campos_custom: campos });
    await logCambio("empresa", id, descripcion ?? "Editó un campo personalizado");
    revalidatePath(`/empresas/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/* ---------------- stage move ---------------- */

export async function moveOportunidadEtapa(id: string, etapaId: string): Promise<SaveResult> {
  try {
    await moveOportunidadToEtapa({ oportunidad_id: id, etapa_id: etapaId });
    revalidatePath(`/oportunidades/${id}`);
    revalidatePath("/oportunidades/kanban");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
