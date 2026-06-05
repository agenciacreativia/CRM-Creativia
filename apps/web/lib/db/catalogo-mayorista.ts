import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/db/planes";

export type ProductoMayorista = {
  id: string;
  nombre: string;
  categoria: string | null;
  destino: string | null;
  duracion: string | null;
  proveedor: string | null;
  descripcion: string | null;
  incluye: string | null;
  no_incluye: string | null;
  precio_neto: number | null;
  moneda: string;
  cupo: number | null;
  fecha_salida: string | null;
  activo: boolean;
  // Campos para filtrar/expandir (opcionales — sólo los puebla el catálogo externo).
  origen?: string | null;
  paises?: string[];
  aerolineas?: string[];
  salidas?: SalidaCatalogo[];
  imagen_url?: string | null;
};

export type SalidaCatalogo = {
  fecha_salida: string;
  fecha_regreso: string | null;
  precio_dbl: number | null;
  precio_tpl: number | null;
  precio_sgl: number | null;
  precio_nino: number | null;
  aerolinea: string | null;
  cupos: number;
};

const COLS = "id, nombre, categoria, destino, duracion, proveedor, descripcion, incluye, no_incluye, precio_neto, moneda, cupo, fecha_salida, activo";

/** The shared wholesaler catalog. Visible to all agencies. Defensive: [] pre-0027. */
export async function listCatalogoMayorista(
  opts: { q?: string; categoria?: string; soloActivos?: boolean } = {},
): Promise<ProductoMayorista[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from("producto_mayorista").select(COLS).order("nombre");
  if (opts.q) {
    const s = `%${opts.q}%`;
    query = query.or(`nombre.ilike.${s},destino.ilike.${s},proveedor.ilike.${s}`);
  }
  if (opts.categoria && opts.categoria !== "todos") query = query.eq("categoria", opts.categoria);
  if (opts.soloActivos) query = query.eq("activo", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ProductoMayorista[];
}

export type CatalogoInput = {
  nombre: string;
  categoria: string | null;
  destino: string | null;
  duracion: string | null;
  proveedor: string | null;
  descripcion: string | null;
  incluye: string | null;
  no_incluye: string | null;
  precio_neto: number | null;
  moneda: string;
  cupo: number | null;
  fecha_salida: string | null;
  activo: boolean;
};

async function ensurePlatform() {
  if (!(await isPlatformAdmin())) throw new Error("Solo Turistea (plataforma) puede editar el catálogo");
}

export async function createCatalogoItem(input: CatalogoInput): Promise<string> {
  await ensurePlatform();
  const admin = createAdminSupabase();
  const { data, error } = await admin.from("producto_mayorista").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCatalogoItem(id: string, input: CatalogoInput): Promise<void> {
  await ensurePlatform();
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("producto_mayorista")
    .update({ ...input, actualizado_en: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogoItem(id: string): Promise<void> {
  await ensurePlatform();
  const admin = createAdminSupabase();
  const { error } = await admin.from("producto_mayorista").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type ProductoCopiable = Pick<
  ProductoMayorista,
  "nombre" | "categoria" | "destino" | "duracion" | "proveedor" | "descripcion" | "incluye" | "no_incluye" | "precio_neto" | "moneda"
>;

/**
 * Agency copies a wholesaler product into its own catalog, applying a markup.
 * Works for both the local and external (website) catalog — receives the
 * product data directly. Uses the agency's RLS context (respects plan + perms).
 */
export async function copiarAMisProductos(item: ProductoCopiable, markupPct: number): Promise<string> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const neto = item.precio_neto ?? 0;
  const precioVenta = Math.round(neto * (1 + (Number(markupPct) || 0) / 100) * 100) / 100;
  const { data, error } = await supabase
    .from("producto")
    .insert({
      tenant_id: user.tenantId,
      nombre: item.nombre,
      categoria: item.categoria,
      destino: item.destino,
      duracion: item.duracion,
      proveedor: item.proveedor,
      descripcion: item.descripcion,
      incluye: item.incluye,
      no_incluye: item.no_incluye,
      precio_desde: precioVenta,
      moneda: item.moneda,
      activo: true,
      creado_por: user.id,
      origen: "turistea",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Bulk copy: applies the same markup to every item. Returns count of inserted. */
export async function copiarMultiplesAMisProductos(items: ProductoCopiable[], markupPct: number): Promise<number> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  if (!items.length) return 0;
  const supabase = await createServerSupabase();
  const factor = 1 + (Number(markupPct) || 0) / 100;
  const rows = items.map((item) => ({
    tenant_id: user.tenantId,
    nombre: item.nombre,
    categoria: item.categoria,
    destino: item.destino,
    duracion: item.duracion,
    proveedor: item.proveedor,
    descripcion: item.descripcion,
    incluye: item.incluye,
    no_incluye: item.no_incluye,
    precio_desde: Math.round((item.precio_neto ?? 0) * factor * 100) / 100,
    moneda: item.moneda,
    activo: true,
    creado_por: user.id,
    origen: "turistea",
  }));
  const { data, error } = await supabase.from("producto").insert(rows).select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
