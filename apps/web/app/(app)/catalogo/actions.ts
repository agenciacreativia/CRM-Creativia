"use server";

import { copiarAMisProductos, copiarMultiplesAMisProductos, type ProductoCopiable } from "@/lib/db/catalogo-mayorista";

export async function copiarProductoAction(
  item: ProductoCopiable,
  markupPct: number,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const id = await copiarAMisProductos(item, markupPct);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function copiarMultiplesProductosAction(
  items: ProductoCopiable[],
  markupPct: number,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  try {
    const count = await copiarMultiplesAMisProductos(items, markupPct);
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
