import "server-only";
import { createCuposSupabase } from "@/lib/supabase/externo";
import type { ProductoMayorista, SalidaCatalogo } from "@/lib/db/catalogo-mayorista";

/**
 * Reads the live wholesaler catalog from the Turistea website (bloqueos +
 * bloqueo_fechas). One product per bloqueo, with every upcoming vigente
 * departure attached so the UI can filter by date / airline / origin and
 * show all the options. Cached 60s.
 */

type CacheEntry = { at: number; data: ProductoMayorista[] };
let cache: CacheEntry | null = null;
const TTL_MS = 60_000;

type FechaRow = {
  fecha_salida: string | null;
  fecha_regreso: string | null;
  cupos_total: number | null;
  cupos_reservados: number | null;
  precio_dbl: number | null;
  precio_tpl: number | null;
  precio_sgl: number | null;
  precio_nino: number | null;
  aerolinea: string | null;
  estado_salida: string | null;
};
type ImagenRow = { storage_path: string | null; es_principal: boolean | null; orden: number | null };
type BloqueoRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  descripcion_corta: string | null;
  dias: number | null;
  noches: number | null;
  ciudad_origen: string | null;
  paises: string[] | null;
  ciudades: string[] | null;
  moneda: string | null;
  incluye: string | null;
  no_incluye: string | null;
  bloqueo_fechas: FechaRow[] | null;
  bloqueo_imagenes: ImagenRow[] | null;
};

const PUBLIC_BUCKET = "bloqueo-images";
function imgUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.CUPOS_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}` : null;
}

export async function listCatalogoExterno(): Promise<ProductoMayorista[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const supabase = createCuposSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("bloqueos")
      .select(
        "id, nombre, descripcion, descripcion_corta, dias, noches, ciudad_origen, paises, ciudades, moneda, incluye, no_incluye, estado, destacado, bloqueo_fechas(fecha_salida, fecha_regreso, cupos_total, cupos_reservados, precio_dbl, precio_tpl, precio_sgl, precio_nino, aerolinea, estado_salida), bloqueo_imagenes(storage_path, es_principal, orden)",
      )
      .eq("estado", "publicado")
      .order("destacado", { ascending: false });
    if (error) return [];

    const hoy = new Date().toISOString().slice(0, 10);
    const productos = ((data ?? []) as BloqueoRow[]).map((b): ProductoMayorista => {
      const fechas = (b.bloqueo_fechas ?? [])
        .filter((f) => f.estado_salida === "vigente" && f.fecha_salida && f.fecha_salida >= hoy)
        .sort((a, c) => (a.fecha_salida ?? "").localeCompare(c.fecha_salida ?? ""));
      const salidas: SalidaCatalogo[] = fechas.map((f) => ({
        fecha_salida: f.fecha_salida as string,
        fecha_regreso: f.fecha_regreso,
        precio_dbl: f.precio_dbl,
        precio_tpl: f.precio_tpl,
        precio_sgl: f.precio_sgl,
        precio_nino: f.precio_nino,
        aerolinea: f.aerolinea,
        cupos: Math.max(0, (f.cupos_total ?? 0) - (f.cupos_reservados ?? 0)),
      }));
      const precios = fechas.map((f) => f.precio_dbl).filter((p): p is number => p != null && p > 0);
      const proxima = fechas[0];
      const aerolineas = [...new Set(fechas.map((f) => f.aerolinea).filter((a): a is string => !!a))];
      const destinos = (b.paises?.length ? b.paises : b.ciudades) ?? [];
      const imgs = [...(b.bloqueo_imagenes ?? [])].sort((x, y) => {
        const px = x.es_principal ? 0 : 1, py = y.es_principal ? 0 : 1;
        if (px !== py) return px - py;
        return (x.orden ?? 999) - (y.orden ?? 999);
      });
      const imagen_url = imgUrl(imgs[0]?.storage_path ?? null);
      return {
        id: b.id,
        nombre: b.nombre,
        categoria: "Paquete",
        destino: destinos.length ? destinos.join(", ") : (b.ciudad_origen ?? null),
        duracion: b.dias ? `${b.dias} días${b.noches ? ` / ${b.noches} noches` : ""}` : null,
        proveedor: proxima?.aerolinea ?? null,
        descripcion: b.descripcion_corta || b.descripcion || null,
        incluye: b.incluye,
        no_incluye: b.no_incluye,
        precio_neto: precios.length ? Math.min(...precios) : null,
        moneda: b.moneda ?? "USD",
        cupo: proxima ? Math.max(0, (proxima.cupos_total ?? 0) - (proxima.cupos_reservados ?? 0)) : null,
        fecha_salida: proxima?.fecha_salida ?? null,
        activo: true,
        origen: b.ciudad_origen,
        paises: b.paises ?? [],
        aerolineas,
        salidas,
        imagen_url,
      };
    });

    cache = { at: Date.now(), data: productos };
    return productos;
  } catch {
    return cache?.data ?? [];
  }
}
