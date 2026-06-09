"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

const BUCKET = "productos";

async function ensurePropio(productoId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("producto").select("origen").eq("id", productoId).maybeSingle();
  if (!data) throw new Error("Producto no encontrado");
  if ((data.origen ?? "propio") !== "propio") throw new Error("Los productos Turistea no se pueden editar");
}

export async function setImagenAction(productoId: string, fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensurePropio(productoId);
    const user = await getSessionUser();
    if (!user?.tenantId) throw new Error("Sesión inválida");
    const file = fd.get("file");
    if (!(file instanceof File)) throw new Error("Archivo no enviado");
    const supabase = await createServerSupabase();
    const path = `${user.tenantId}/${productoId}/cover-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // Validar que la URL publica sea http(s) valida antes de persistir; si no, guardamos el path como fallback
    const publicUrl = pub?.publicUrl;
    const url = typeof publicUrl === "string" && /^https?:\/\//i.test(publicUrl) ? publicUrl : path;
    const { error } = await supabase.from("producto").update({ imagen_path: url }).eq("id", productoId);
    if (error) throw error;
    revalidatePath(`/productos/${productoId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function addAdjuntoAction(productoId: string, fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensurePropio(productoId);
    const user = await getSessionUser();
    if (!user?.tenantId) throw new Error("Sesión inválida");
    const file = fd.get("file");
    if (!(file instanceof File)) throw new Error("Archivo no enviado");
    const supabase = await createServerSupabase();
    const path = `${user.tenantId}/${productoId}/adj-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    const { data: cur } = await supabase.from("producto").select("adjuntos").eq("id", productoId).maybeSingle();
    const adjs: { path: string; nombre: string; tipo?: string }[] = Array.isArray(cur?.adjuntos) ? cur!.adjuntos : [];
    adjs.push({ path, nombre: file.name, tipo: file.type });
    const { error } = await supabase.from("producto").update({ adjuntos: adjs }).eq("id", productoId);
    if (error) throw error;
    revalidatePath(`/productos/${productoId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function removeAdjuntoAction(productoId: string, path: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensurePropio(productoId);
    const supabase = await createServerSupabase();
    await supabase.storage.from(BUCKET).remove([path]);
    const { data: cur } = await supabase.from("producto").select("adjuntos").eq("id", productoId).maybeSingle();
    const adjs: { path: string; nombre: string }[] = (Array.isArray(cur?.adjuntos) ? cur!.adjuntos : []).filter((a: { path: string }) => a.path !== path);
    const { error } = await supabase.from("producto").update({ adjuntos: adjs }).eq("id", productoId);
    if (error) throw error;
    revalidatePath(`/productos/${productoId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
