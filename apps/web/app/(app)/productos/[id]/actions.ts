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

/**
 * Reordena los adjuntos según el orden de paths recibido. Útil para que el usuario
 * decida qué adjuntos aparecen primero en la vista del producto.
 */
export async function reorderAdjuntosAction(productoId: string, pathsOrdenados: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensurePropio(productoId);
    const supabase = await createServerSupabase();
    const { data: cur } = await supabase.from("producto").select("adjuntos").eq("id", productoId).maybeSingle();
    const adjsActuales: { path: string; nombre: string; tipo?: string }[] = Array.isArray(cur?.adjuntos) ? cur!.adjuntos : [];
    // Reordenar respetando el orden recibido; los paths que no estén en la lista se descartan.
    const byPath = new Map(adjsActuales.map((a) => [a.path, a]));
    const reordered = pathsOrdenados
      .map((p) => byPath.get(p))
      .filter((a): a is { path: string; nombre: string; tipo?: string } => !!a);
    // Si recibimos menos que los actuales, completamos con los que quedaron afuera al final.
    const seen = new Set(reordered.map((a) => a.path));
    for (const a of adjsActuales) if (!seen.has(a.path)) reordered.push(a);
    const { error } = await supabase.from("producto").update({ adjuntos: reordered }).eq("id", productoId);
    if (error) throw error;
    revalidatePath(`/productos/${productoId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Devuelve una signed URL temporal para abrir/descargar un adjunto.
 * Valida que el producto sea propio del tenant del usuario.
 */
export async function getAdjuntoUrlAction(productoId: string, path: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user?.tenantId) throw new Error("Sesión inválida");
    const supabase = await createServerSupabase();
    // El producto debe pertenecer al tenant del usuario (RLS lo refuerza, pero verificamos aquí).
    const { data: prod } = await supabase.from("producto").select("id, tenant_id, adjuntos").eq("id", productoId).maybeSingle();
    if (!prod) throw new Error("Producto no encontrado");
    if (prod.tenant_id !== user.tenantId) throw new Error("Producto fuera de tu cuenta");
    // El path debe pertenecer a la lista de adjuntos del producto (no se puede pedir cualquier path).
    const adjs: { path: string }[] = Array.isArray(prod.adjuntos) ? prod.adjuntos : [];
    if (!adjs.some((a) => a.path === path)) throw new Error("Adjunto no encontrado en este producto");
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10); // 10 minutos
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "No se pudo generar URL");
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
