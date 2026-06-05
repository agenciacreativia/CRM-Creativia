"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { logCambio } from "@/lib/db/mutations";
import { DOCUMENTOS_BUCKET } from "@/lib/db/documentos";

export type DocResult = { ok: boolean; error?: string; url?: string };

type Entidad = "empresa" | "contacto" | "oportunidad";

function pathFor(entidad: Entidad, id: string): string {
  switch (entidad) {
    case "empresa":
      return `/empresas/${id}`;
    case "contacto":
      return `/contactos/${id}`;
    default:
      return `/oportunidades/${id}`;
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "archivo";
}

export async function uploadDocumentoAction(formData: FormData): Promise<DocResult> {
  const user = await getSessionUser();
  if (!user?.tenantId) return { ok: false, error: "No autenticado" };

  const entidad = String(formData.get("entidad")) as Entidad;
  const entityId = String(formData.get("entity_id"));
  const file = formData.get("file");

  if (!["empresa", "contacto", "oportunidad"].includes(entidad) || !entityId) {
    return { ok: false, error: "Destino inválido" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Seleccioná un archivo" };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "El archivo supera 25 MB" };
  }

  const storagePath = `${user.tenantId}/${entidad}/${entityId}/${crypto.randomUUID()}_${safeName(file.name)}`;

  try {
    const admin = createAdminSupabase();
    const { error: upErr } = await admin.storage
      .from(DOCUMENTOS_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const supabase = await createServerSupabase();
    const { error: dbErr } = await supabase.from("documento").insert({
      tenant_id: user.tenantId,
      entidad,
      entity_id: entityId,
      nombre: file.name,
      storage_path: storagePath,
      tamano_bytes: file.size,
      tipo_mime: file.type || null,
      subido_por: user.id,
    });
    if (dbErr) {
      // roll back the orphaned storage object
      await admin.storage.from(DOCUMENTOS_BUCKET).remove([storagePath]);
      return { ok: false, error: dbErr.message };
    }

    await logCambio(entidad, entityId, `Subió un documento: ${file.name}`);
    revalidatePath(pathFor(entidad, entityId));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function signDocumentoUrlAction(id: string): Promise<DocResult> {
  const supabase = await createServerSupabase();
  const { data: doc } = await supabase
    .from("documento")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc?.storage_path) return { ok: false, error: "Documento no encontrado" };

  const admin = createAdminSupabase();
  const { data, error } = await admin.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(doc.storage_path, 3600);
  if (error || !data?.signedUrl) return { ok: false, error: error?.message ?? "Error" };
  return { ok: true, url: data.signedUrl };
}

export async function deleteDocumentoAction(id: string): Promise<DocResult> {
  const supabase = await createServerSupabase();
  const { data: doc } = await supabase
    .from("documento")
    .select("storage_path, nombre, entidad, entity_id")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Documento no encontrado" };

  try {
    const admin = createAdminSupabase();
    await admin.storage.from(DOCUMENTOS_BUCKET).remove([doc.storage_path]);
    const { error } = await supabase.from("documento").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    await logCambio(doc.entidad as Entidad, doc.entity_id, `Eliminó un documento: ${doc.nombre}`);
    revalidatePath(pathFor(doc.entidad as Entidad, doc.entity_id));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
