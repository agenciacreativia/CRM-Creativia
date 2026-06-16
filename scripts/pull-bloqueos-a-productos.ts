/**
 * Copia bloqueos del sitio a "productos propios" del tenant Creativia, CON el
 * itinerario día-a-día (bloqueo_itinerario). Para probar que el itinerario se
 * carga en el módulo de productos del CRM.
 *
 * Run: node_modules/.bin/tsx scripts/pull-bloqueos-a-productos.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const l of readFileSync(resolve("apps/web/.env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const TENANT = "33333333-3333-3333-3333-333333333333"; // Creativia
const SLUGS = ["italia-al-completo-2026", "fantasia-italiana-2026"];

async function main() {
  const cupos = createClient(process.env.CUPOS_SUPABASE_URL!, process.env.CUPOS_SUPABASE_KEY!, { auth: { persistSession: false } });
  const crm = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // creado_por: un admin del tenant
  const { data: admin } = await crm.from("usuario").select("id").eq("tenant_id", TENANT).eq("rol", "admin").limit(1).maybeSingle();
  const creadoPor = admin?.id ?? null;

  for (const slug of SLUGS) {
    const { data: b } = await cupos
      .from("bloqueos")
      .select("id, nombre, descripcion, descripcion_corta, dias, noches, ciudad_origen, paises, ciudades, moneda, incluye, no_incluye, bloqueo_fechas(precio_dbl), bloqueo_itinerario(dia,titulo,descripcion,ciudad,orden)")
      .eq("slug", slug)
      .maybeSingle();
    if (!b) { console.log(slug, "NO ENCONTRADO"); continue; }
    const row = b as any;
    const itin = (row.bloqueo_itinerario || [])
      .sort((a: any, c: any) => (a.orden - c.orden) || (a.dia - c.dia))
      .map((i: any) => ({ dia: Number(i.dia) || 0, titulo: i.titulo ?? "", ciudad: i.ciudad ?? null, descripcion: i.descripcion ?? null }));
    const precios = (row.bloqueo_fechas || []).map((f: any) => f.precio_dbl).filter((p: any) => p > 0);
    const destinos = (row.paises?.length ? row.paises : row.ciudades) ?? [];

    // evitar duplicados por nombre
    const { data: exist } = await crm.from("producto").select("id").eq("tenant_id", TENANT).eq("nombre", row.nombre).maybeSingle();
    if (exist) {
      await crm.from("producto").update({ itinerario: itin }).eq("id", exist.id);
      console.log(`↻ ${row.nombre} ya existía — itinerario actualizado (${itin.length} días)`);
      continue;
    }

    const { data: ins, error } = await crm.from("producto").insert({
      tenant_id: TENANT,
      nombre: row.nombre,
      categoria: "Paquete",
      destino: destinos.length ? destinos.join(", ") : row.ciudad_origen,
      duracion: row.dias ? `${row.dias} días${row.noches ? ` / ${row.noches} noches` : ""}` : null,
      proveedor: "Turistea",
      descripcion: row.descripcion_corta || row.descripcion || null,
      incluye: row.incluye,
      no_incluye: row.no_incluye,
      precio_desde: precios.length ? Math.min(...precios) : null,
      moneda: row.moneda ?? "USD",
      itinerario: itin,
      activo: true,
      creado_por: creadoPor,
      origen: "turistea",
    }).select("id").single();
    if (error) { console.log(slug, "ERR", error.message); continue; }
    console.log(`+ ${row.nombre} → producto ${ins!.id} con ${itin.length} días de itinerario`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
