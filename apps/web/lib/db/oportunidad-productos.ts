import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type OportunidadProducto = {
  id: string;
  producto_id: string | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  moneda: string;
};

const COLS = "id, producto_id, nombre, cantidad, precio_unitario, moneda";

/** Products attached to an opportunity. Defensive: [] if table missing (pre-0017). */
export async function listOportunidadProductos(oportunidadId: string): Promise<OportunidadProducto[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad_producto")
    .select(COLS)
    .eq("oportunidad_id", oportunidadId)
    .order("creado_en", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    producto_id: (r.producto_id as string | null) ?? null,
    nombre: r.nombre as string,
    cantidad: Number(r.cantidad) || 0,
    precio_unitario: Number(r.precio_unitario) || 0,
    moneda: (r.moneda as string) ?? "USD",
  }));
}
