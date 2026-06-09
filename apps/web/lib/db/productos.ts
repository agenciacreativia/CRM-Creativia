import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ItinerarioDia } from "@/lib/cotizacion/types";

export type Producto = {
  id: string;
  nombre: string;
  categoria: string | null;
  destino: string | null;
  duracion: string | null;
  precio_desde: number | null;
  moneda: string;
  descripcion: string | null;
  incluye: string | null;
  no_incluye: string | null;
  proveedor: string | null;
  activo: boolean;
  creado_en: string;
  imagen_path: string | null;
  adjuntos: { path: string; nombre: string; tipo?: string }[];
  origen: "propio" | "turistea";
  /** Plan turístico por defecto (heredable a cotización al insertar el producto). */
  itinerario: ItinerarioDia[];
};

export const PRODUCTO_CATEGORIAS = [
  "Paquete",
  "Vuelo",
  "Hotel",
  "Crucero",
  "Tour",
  "Traslado",
  "Asistencia",
  "Otro",
] as const;

const COLS =
  "id, nombre, categoria, destino, duracion, precio_desde, moneda, descripcion, incluye, no_incluye, proveedor, activo, creado_en, imagen_path, adjuntos, origen, itinerario";
// Si la mig 0041 todavía no se corrió, el SELECT falla con "column does not exist".
// Hacemos fallback al COLS_LEGACY (sin itinerario).
const COLS_LEGACY =
  "id, nombre, categoria, destino, duracion, precio_desde, moneda, descripcion, incluye, no_incluye, proveedor, activo, creado_en, imagen_path, adjuntos, origen";

const isMissingItinerarioColumn = (msg: string | undefined): boolean =>
  !!msg && /column.*itinerario.*does not exist/i.test(msg);

function normalize(p: Producto): Producto {
  return {
    ...p,
    adjuntos: Array.isArray(p.adjuntos) ? p.adjuntos : [],
    origen: (p.origen as Producto["origen"]) ?? "propio",
    itinerario: Array.isArray(p.itinerario) ? p.itinerario : [],
  };
}

/** List products for the current tenant. Defensive: [] if table missing (pre-0015). */
export async function listProductos(
  opts: { q?: string; categoria?: string; soloActivos?: boolean; limit?: number } = {},
): Promise<Producto[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from("producto").select(COLS).order("nombre", { ascending: true }).limit(opts.limit ?? 500);

  if (opts.q) {
    const s = `%${opts.q}%`;
    query = query.or(`nombre.ilike.${s},destino.ilike.${s},proveedor.ilike.${s}`);
  }
  if (opts.categoria && opts.categoria !== "todos") query = query.eq("categoria", opts.categoria);
  if (opts.soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;
  if (error) {
    if (isMissingItinerarioColumn(error.message)) {
      // Reintento sin la columna nueva.
      let q2 = supabase.from("producto").select(COLS_LEGACY).order("nombre", { ascending: true }).limit(opts.limit ?? 500);
      if (opts.q) {
        const s = `%${opts.q}%`;
        q2 = q2.or(`nombre.ilike.${s},destino.ilike.${s},proveedor.ilike.${s}`);
      }
      if (opts.categoria && opts.categoria !== "todos") q2 = q2.eq("categoria", opts.categoria);
      if (opts.soloActivos) q2 = q2.eq("activo", true);
      const retry = await q2;
      return ((retry.data ?? []) as Producto[]).map(normalize);
    }
    return [];
  }
  return ((data ?? []) as Producto[]).map(normalize);
}

/** Oportunidades que tienen este producto asociado (vía oportunidad_producto). */
export async function listOportunidadesPorProducto(productoId: string): Promise<{
  id: string; nombre: string; estado: string; valor: number | null; moneda: string;
  asignado_nombre: string | null;
}[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad_producto")
    .select("oportunidad(id, nombre, estado, valor, moneda, usuario!oportunidad_asignado_id_fkey(nombre))")
    .eq("producto_id", productoId);
  if (error || !data) return [];
  type Row = { oportunidad: { id: string; nombre: string; estado: string; valor: number | null; moneda: string; usuario: { nombre: string } | { nombre: string }[] | null } | null };
  return (data as unknown as Row[]).map((r) => {
    const o = r.oportunidad;
    if (!o) return null;
    const u = Array.isArray(o.usuario) ? o.usuario[0] : o.usuario;
    return { id: o.id, nombre: o.nombre, estado: o.estado, valor: o.valor, moneda: o.moneda, asignado_nombre: u?.nombre ?? null };
  }).filter((x): x is NonNullable<typeof x> => !!x && x.estado !== "eliminado");
}

export async function getProducto(id: string): Promise<Producto | null> {
  const supabase = await createServerSupabase();
  const full = await supabase.from("producto").select(COLS).eq("id", id).maybeSingle();
  if (full.error && isMissingItinerarioColumn(full.error.message)) {
    const legacy = await supabase.from("producto").select(COLS_LEGACY).eq("id", id).maybeSingle();
    if (legacy.error || !legacy.data) return null;
    return normalize(legacy.data as Producto);
  }
  if (full.error || !full.data) return null;
  return normalize(full.data as Producto);
}
