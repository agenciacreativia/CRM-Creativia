"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCampoPersonalizado,
  updateCampoPersonalizado,
  deleteCampoPersonalizado,
  setCampoMostrarEnForm,
  updateCamposCustom,
} from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const schema = z.object({
  tipo_entidad: z.enum(["empresa", "contacto", "oportunidad"]),
  clave: z.string().trim().regex(/^[a-z][a-z0-9_]{0,49}$/, "Clave inválida — usá solo a-z, 0-9, _ (empezando con letra)"),
  etiqueta: z.string().trim().min(1, "Etiqueta requerida").max(120),
  etiqueta_en: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  tipo: z.enum(["texto", "numero", "moneda", "fecha", "seleccion", "checkbox", "textarea"]),
  opciones: z.preprocess(
    (v) => {
      if (!v || typeof v !== "string") return null;
      const items = v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      return items.length > 0 ? items : null;
    },
    z.array(z.string()).nullable(),
  ),
  requerido: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
});

type Result = { ok: true; id?: string } | { ok: false; error: string };

export async function createCampoAction(formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const id = await createCampoPersonalizado({ ...parsed.data, orden: 999 });
    revalidatePath("/admin/campos");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateCampoAction(id: string, formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await updateCampoPersonalizado(id, parsed.data);
    revalidatePath("/admin/campos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteCampoAction(id: string): Promise<Result> {
  try {
    await deleteCampoPersonalizado(id);
    revalidatePath("/admin/campos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function toggleCampoMostrarAction(id: string, value: boolean): Promise<Result> {
  try {
    await setCampoMostrarEnForm(id, value);
    revalidatePath("/admin/campos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Save dynamic custom field values for one entity row. Called from
 * the CamposCustomSection on detail pages.
 */
export async function saveCamposCustomAction(args: {
  tipo_entidad: "empresa" | "contacto" | "oportunidad";
  entity_id: string;
  values: Record<string, unknown>;
}): Promise<Result> {
  try {
    await updateCamposCustom(args);
    const path = args.tipo_entidad === "empresa" ? "empresas" : args.tipo_entidad === "contacto" ? "contactos" : "oportunidades";
    revalidatePath(`/${path}/${args.entity_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
