import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export type EmpresaSecundaria = {
  empresa_id: string;
  empresa_nombre: string;
  rol: string | null;
  creado_en: string;
};

const isMissingTable = (msg: string | undefined) =>
  !!msg && /relation\s+["']?(public\.)?contacto_empresa_secundaria["']?\s+does not exist/i.test(msg);

/** Trae las empresas SECUNDARIAS (no la principal) del contacto. */
export async function listEmpresasSecundarias(contactoId: string): Promise<EmpresaSecundaria[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contacto_empresa_secundaria")
    .select("empresa_id, rol, creado_en, empresa:empresa_id(nombre)")
    .eq("contacto_id", contactoId)
    .order("creado_en", { ascending: false });
  if (error) {
    if (isMissingTable(error.message)) return []; // mig 0042 sin correr
    return [];
  }
  type Row = { empresa_id: string; rol: string | null; creado_en: string; empresa: { nombre: string | null } | { nombre: string | null }[] | null };
  return ((data ?? []) as Row[]).map((r) => {
    const emp = Array.isArray(r.empresa) ? r.empresa[0] : r.empresa;
    return {
      empresa_id: r.empresa_id,
      empresa_nombre: emp?.nombre ?? "—",
      rol: r.rol,
      creado_en: r.creado_en,
    };
  });
}

export async function agregarEmpresaSecundaria(
  contactoId: string,
  empresaId: string,
  rol: string | null,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  if (!user.tenantId) throw new Error("Tenant ausente");
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("contacto_empresa_secundaria")
    .insert({ contacto_id: contactoId, empresa_id: empresaId, tenant_id: user.tenantId, rol });
  if (error) {
    if (isMissingTable(error.message)) {
      throw new Error("Para usar empresas adicionales corré la migración 0042 en Supabase.");
    }
    // Insertar duplicado da 23505 — lo mostramos amigable.
    if (/duplicate key/i.test(error.message)) {
      throw new Error("Esa empresa ya está vinculada al contacto.");
    }
    throw new Error(error.message);
  }
}

export async function quitarEmpresaSecundaria(contactoId: string, empresaId: string): Promise<void> {
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("contacto_empresa_secundaria")
    .delete()
    .eq("contacto_id", contactoId)
    .eq("empresa_id", empresaId);
  if (error && !isMissingTable(error.message)) throw new Error(error.message);
}
