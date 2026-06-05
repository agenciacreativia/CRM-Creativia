"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPasajero,
  updatePasajero,
  deletePasajero,
  subirArchivoPasajero,
  getArchivoPasajeroUrl,
} from "@/lib/db/pasajeros";

type Result = { ok: boolean; error?: string; id?: string };

const schema = z.object({
  oportunidadId: z.string().uuid(),
  nombre: z.string().trim().min(1, "Nombre requerido").max(160),
  documento: z.string().trim().max(60).nullable().optional().default(null),
  fecha_nacimiento: z.string().nullable().optional().default(null),
  doc_vencimiento: z.string().nullable().optional().default(null),
  tipo: z.enum(["adulto", "nino", "bebe"]).default("adulto"),
  email: z.string().trim().max(160).nullable().optional().default(null),
  telefono: z.string().trim().max(40).nullable().optional().default(null),
});

export async function crearPasajeroAction(payload: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    const id = await createPasajero({
      oportunidadId: d.oportunidadId,
      nombre: d.nombre,
      documento: d.documento ?? null,
      fecha_nacimiento: d.fecha_nacimiento || null,
      doc_vencimiento: d.doc_vencimiento || null,
      tipo: d.tipo,
      email: d.email ?? null,
      telefono: d.telefono ?? null,
    });
    revalidatePath(`/oportunidades/${d.oportunidadId}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function actualizarPasajeroAction(
  id: string,
  oportunidadId: string,
  patch: Omit<z.input<typeof schema>, "oportunidadId">,
): Promise<Result> {
  const parsed = schema.omit({ oportunidadId: true }).safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    await updatePasajero(id, {
      nombre: d.nombre,
      documento: d.documento ?? null,
      fecha_nacimiento: d.fecha_nacimiento || null,
      doc_vencimiento: d.doc_vencimiento || null,
      tipo: d.tipo,
      email: d.email ?? null,
      telefono: d.telefono ?? null,
    });
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarPasajeroAction(id: string, oportunidadId: string): Promise<Result> {
  try {
    await deletePasajero(id);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function subirArchivoPasajeroAction(formData: FormData): Promise<Result> {
  try {
    const pasajeroId = String(formData.get("pasajeroId") ?? "");
    const oportunidadId = String(formData.get("oportunidadId") ?? "");
    const file = formData.get("archivo");
    if (!pasajeroId || !(file instanceof File)) return { ok: false, error: "Archivo inválido" };
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: "El archivo supera 8 MB" };
    const okType = ["image/", "application/pdf"].some((t) => file.type.startsWith(t));
    if (!okType) return { ok: false, error: "Solo imágenes o PDF" };
    const buffer = Buffer.from(await file.arrayBuffer());
    await subirArchivoPasajero(pasajeroId, { nombre: file.name, mime: file.type, buffer });
    if (oportunidadId) revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function verArchivoPasajeroAction(pasajeroId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const url = await getArchivoPasajeroUrl(pasajeroId);
    return url ? { ok: true, url } : { ok: false, error: "Sin archivo" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
