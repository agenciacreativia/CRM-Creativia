import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { EmailAttachment } from "@/lib/google/gmail";

export const DOCUMENTOS_BUCKET = "documentos";

export type Documento = {
  id: string;
  nombre: string;
  storage_path: string;
  tamano_bytes: number | null;
  tipo_mime: string | null;
  subido_por_nombre: string | null;
  creado_en: string;
};

/** List documents for an entity. Defensive: [] if table missing (pre-0011). */
export async function listDocumentos(
  entidad: "empresa" | "contacto" | "oportunidad",
  entityId: string,
): Promise<Documento[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("documento")
    .select("id, nombre, storage_path, tamano_bytes, tipo_mime, creado_en, usuario:subido_por(nombre)")
    .eq("entidad", entidad)
    .eq("entity_id", entityId)
    .order("creado_en", { ascending: false });
  if (error) return [];
  return (data ?? []).map(
    (row: {
      id: string;
      nombre: string;
      storage_path: string;
      tamano_bytes: number | null;
      tipo_mime: string | null;
      creado_en: string;
      usuario: { nombre: string } | { nombre: string }[] | null;
    }) => {
      const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
      return {
        id: row.id,
        nombre: row.nombre,
        storage_path: row.storage_path,
        tamano_bytes: row.tamano_bytes,
        tipo_mime: row.tipo_mime,
        subido_por_nombre: u?.nombre ?? null,
        creado_en: row.creado_en,
      };
    },
  );
}

/** Download a document's content as an email attachment. RLS-checked, null if not found. */
export async function loadDocumentoAttachment(id: string): Promise<EmailAttachment | null> {
  const supabase = await createServerSupabase();
  const { data: doc } = await supabase
    .from("documento")
    .select("nombre, storage_path, tipo_mime")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return null; // RLS ensures it's in the user's tenant
  const admin = createAdminSupabase();
  const { data: blob } = await admin.storage.from(DOCUMENTOS_BUCKET).download(doc.storage_path);
  if (!blob) return null;
  const buf = Buffer.from(await blob.arrayBuffer());
  return {
    filename: doc.nombre,
    mimeType: doc.tipo_mime ?? "application/octet-stream",
    contentBase64: buf.toString("base64"),
  };
}
