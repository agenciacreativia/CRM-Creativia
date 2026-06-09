import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { DOCUMENTOS_BUCKET } from "@/lib/db/documentos";

export type Pasajero = {
  id: string;
  nombre: string;
  documento: string | null;
  fecha_nacimiento: string | null;
  doc_vencimiento: string | null;
  tipo: "adulto" | "nino" | "bebe";
  email: string | null;
  telefono: string | null;
  habitacion_id: string | null;
  archivo_nombre: string | null;
  archivo_path: string | null;
  archivo_mime: string | null;
};

const COLS = "id, nombre, documento, fecha_nacimiento, doc_vencimiento, tipo, email, telefono, habitacion_id, archivo_nombre, archivo_path, archivo_mime";

export async function listPasajeros(oportunidadId: string): Promise<Pasajero[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pasajero")
    .select(COLS)
    .eq("oportunidad_id", oportunidadId)
    .order("creado_en", { ascending: true });
  if (error) return [];
  return (data ?? []) as Pasajero[];
}

export type PasajeroInput = {
  oportunidadId: string;
  nombre: string;
  documento: string | null;
  fecha_nacimiento: string | null;
  doc_vencimiento: string | null;
  tipo: "adulto" | "nino" | "bebe";
  email: string | null;
  telefono: string | null;
};

export async function createPasajero(input: PasajeroInput): Promise<string> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pasajero")
    .insert({
      tenant_id: user.tenantId,
      oportunidad_id: input.oportunidadId,
      nombre: input.nombre,
      documento: input.documento,
      fecha_nacimiento: input.fecha_nacimiento,
      doc_vencimiento: input.doc_vencimiento,
      tipo: input.tipo,
      email: input.email,
      telefono: input.telefono,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updatePasajero(id: string, patch: Omit<PasajeroInput, "oportunidadId">): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("pasajero").update(patch).eq("id", id).eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}

export async function deletePasajero(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { data: p } = await supabase.from("pasajero").select("archivo_path").eq("id", id).eq("tenant_id", user.tenantId).maybeSingle();
  if (p?.archivo_path) {
    try {
      await createAdminSupabase().storage.from(DOCUMENTOS_BUCKET).remove([p.archivo_path as string]);
    } catch {
      /* ignore storage cleanup errors */
    }
  }
  const { error } = await supabase.from("pasajero").delete().eq("id", id).eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}

/** Upload a passenger's document (image/PDF) to the CRM storage. */
export async function subirArchivoPasajero(
  pasajeroId: string,
  file: { nombre: string; mime: string; buffer: Buffer },
): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const admin = createAdminSupabase();
  const safe = file.nombre.replace(/[^\w.\-]/g, "_");
  const path = `pasajeros/${user.tenantId}/${pasajeroId}/${safe}`;
  const { error: upErr } = await admin.storage.from(DOCUMENTOS_BUCKET).upload(path, file.buffer, {
    contentType: file.mime || "application/octet-stream",
    upsert: true,
  });
  if (upErr) throw new Error(upErr.message);
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("pasajero")
    .update({ archivo_path: path, archivo_nombre: file.nombre, archivo_mime: file.mime })
    .eq("id", pasajeroId);
  if (error) throw new Error(error.message);
}

/** Signed URL to view a passenger's document inside the CRM. */
export async function getArchivoPasajeroUrl(pasajeroId: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data: p } = await supabase.from("pasajero").select("archivo_path").eq("id", pasajeroId).maybeSingle();
  if (!p?.archivo_path) return null;
  const admin = createAdminSupabase();
  const { data } = await admin.storage.from(DOCUMENTOS_BUCKET).createSignedUrl(p.archivo_path as string, 3600);
  return data?.signedUrl ?? null;
}

/** Passengers + their file content (Buffer) for sending to Turistea on reservation. */
export async function pasajerosConArchivo(oportunidadId: string): Promise<
  (Pasajero & { contenido: Buffer | null })[]
> {
  const pasajeros = await listPasajeros(oportunidadId);
  const admin = createAdminSupabase();
  const out: (Pasajero & { contenido: Buffer | null })[] = [];
  for (const p of pasajeros) {
    let contenido: Buffer | null = null;
    if (p.archivo_path) {
      try {
        const { data } = await admin.storage.from(DOCUMENTOS_BUCKET).download(p.archivo_path);
        if (data) contenido = Buffer.from(await data.arrayBuffer());
      } catch {
        /* ignore */
      }
    }
    out.push({ ...p, contenido });
  }
  return out;
}
