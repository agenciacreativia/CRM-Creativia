import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

async function ensureWriter() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores pueden editar");
  return u;
}

type EmpresaUpdate = {
  nombre: string;
  email: string | null;
  telefono: string | null;
  sitio_web: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  descripcion: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  origen: "web" | "referencia" | "cold_call" | "evento" | "otro" | null;
};

export async function updateEmpresa(id: string, patch: EmpresaUpdate) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("empresa").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

type ContactoUpdate = {
  empresa_id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  descripcion: string | null;
  origen: "empresa" | "linkedin" | "cold_call" | "evento" | "otro" | null;
};

export async function updateContacto(id: string, patch: ContactoUpdate) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("contacto").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
