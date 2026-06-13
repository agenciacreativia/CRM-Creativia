/**
 * Seed de datos "vendedores" para capturas de la landing.
 *
 * Inserta agencias (empresa) + un contacto cada una + oportunidades de turismo
 * repartidas en TODAS las etapas del pipeline default del tenant Creativia,
 * para que el Kanban / listas / dashboard se vean poblados y profesionales.
 *
 * Idempotente: si la empresa ya existe (UNIQUE tenant_id,nombre) la reutiliza y
 * no duplica oportunidades con el mismo nombre.
 *
 * Run:  node_modules/.bin/tsx scripts/seed-landing-demo.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// --- cargar .env.local manualmente (tsx no lo hace solo) --------------------
const envPath = resolve(process.cwd(), "apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TENANT = "33333333-3333-3333-3333-333333333333"; // Creativia
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMPRESAS = [
  { nombre: "Viajes Andinos Tour", ciudad: "Medellín", pais: "Colombia", email: "ventas@viajesandinos.co", tel: "+57 604 444 1100" },
  { nombre: "Caribe Sol Operadora", ciudad: "Cartagena", pais: "Colombia", email: "reservas@caribesol.co", tel: "+57 605 222 8890" },
  { nombre: "Patagonia Expediciones", ciudad: "Bariloche", pais: "Argentina", email: "info@patagoniaexp.com", tel: "+54 294 442 7711" },
  { nombre: "Riviera Maya Travel", ciudad: "Cancún", pais: "México", email: "grupos@rivieramaya.mx", tel: "+52 998 311 5520" },
  { nombre: "Cusco Inca Trips", ciudad: "Cusco", pais: "Perú", email: "hola@cuscoincatrips.pe", tel: "+51 84 226 340" },
  { nombre: "Euro Destinos Premium", ciudad: "Bogotá", pais: "Colombia", email: "comercial@eurodestinos.co", tel: "+57 601 743 9920" },
];

const CONTACTOS = [
  "Laura Restrepo", "Andrés Quintero", "María Fernanda Gil", "Carlos Mendoza", "Daniela Ríos", "Sebastián Lozano",
];

// nombre de oportunidad + valor (USD) + índice de empresa + índice de etapa
const OPS: { nombre: string; valor: number; emp: number; etapa: number }[] = [
  { nombre: "Cancún 7 noches — Familia Ospina", valor: 4200, emp: 3, etapa: 0 },
  { nombre: "Eje Cafetero 4D/3N — Grupo colegio", valor: 1850, emp: 0, etapa: 0 },
  { nombre: "Punta Cana all-inclusive — Luna de miel", valor: 3100, emp: 1, etapa: 0 },
  { nombre: "Europa Clásica 12 días — Grupo senior", valor: 9800, emp: 5, etapa: 1 },
  { nombre: "Machu Picchu + Valle Sagrado", valor: 2650, emp: 4, etapa: 1 },
  { nombre: "Crucero por el Caribe — 2 cabinas", valor: 5400, emp: 1, etapa: 1 },
  { nombre: "Bariloche ski semana — Pareja", valor: 3750, emp: 2, etapa: 2 },
  { nombre: "San Andrés 5D/4N — Promo octubre", valor: 1490, emp: 1, etapa: 2 },
  { nombre: "Cartagena fin de semana — Empresarial", valor: 2200, emp: 1, etapa: 2 },
  { nombre: "Riviera Maya 6 noches — Familia Vélez", valor: 4850, emp: 3, etapa: 3 },
  { nombre: "Tour Europa Mediterránea — Grupo 8 pax", valor: 12400, emp: 5, etapa: 3 },
  { nombre: "Glaciar Perito Moreno + El Calafate", valor: 3950, emp: 2, etapa: 4 },
];

async function main() {
  // 1) pipeline default + etapas
  const { data: pipe } = await admin
    .from("pipeline").select("id").eq("tenant_id", TENANT).eq("es_default", true).maybeSingle();
  const pipelineId = pipe?.id ?? (await admin.from("pipeline").select("id").eq("tenant_id", TENANT).limit(1).single()).data!.id;

  const { data: etapas } = await admin
    .from("etapa_pipeline").select("id,nombre,orden").eq("pipeline_id", pipelineId).order("orden");
  if (!etapas?.length) throw new Error("Sin etapas en el pipeline");
  console.log("Etapas:", etapas.map((e) => e.nombre).join(" → "));

  // 2) usuarios para asignar (rota entre los activos)
  const { data: usuarios } = await admin
    .from("usuario").select("id,nombre").eq("tenant_id", TENANT).eq("activo", true);
  const asignados = (usuarios ?? []).map((u) => u.id);
  const pick = (i: number) => (asignados.length ? asignados[i % asignados.length] : null);

  // 3) empresas + contactos
  const empIds: string[] = [];
  const contIds: string[] = [];
  for (let i = 0; i < EMPRESAS.length; i++) {
    const e = EMPRESAS[i];
    let { data: existing } = await admin
      .from("empresa").select("id").eq("tenant_id", TENANT).eq("nombre", e.nombre).maybeSingle();
    if (!existing) {
      const ins = await admin.from("empresa").insert({
        tenant_id: TENANT, nombre: e.nombre, ciudad: e.ciudad, pais: e.pais,
        email: e.email, telefono: e.tel, estado_empresa: "cliente", origen: "referencia",
      }).select("id").single();
      if (ins.error) throw ins.error;
      existing = ins.data;
      console.log(`+ empresa ${e.nombre}`);
    }
    empIds.push(existing!.id);

    let { data: c } = await admin
      .from("contacto").select("id").eq("empresa_id", existing!.id).limit(1).maybeSingle();
    if (!c) {
      const cins = await admin.from("contacto").insert({
        tenant_id: TENANT, empresa_id: existing!.id, nombre: CONTACTOS[i],
        cargo: "Gerente comercial", email: e.email, telefono: e.tel,
        telefono_whatsapp: e.tel, origen: "empresa",
      }).select("id").single();
      if (cins.error) throw cins.error;
      c = cins.data;
    }
    contIds.push(c!.id);
  }

  // 4) oportunidades
  let created = 0;
  for (let i = 0; i < OPS.length; i++) {
    const o = OPS[i];
    const { data: dup } = await admin
      .from("oportunidad").select("id").eq("tenant_id", TENANT).eq("nombre", o.nombre).maybeSingle();
    if (dup) continue;
    const etapa = etapas[Math.min(o.etapa, etapas.length - 1)];
    const dias = 7 + ((i * 5) % 35);
    const fecha = new Date(Date.UTC(2026, 6, 1 + ((i * 3) % 27))).toISOString().slice(0, 10);
    const ins = await admin.from("oportunidad").insert({
      tenant_id: TENANT, empresa_id: empIds[o.emp], contacto_id: contIds[o.emp],
      pipeline_id: pipelineId, etapa_id: etapa.id, asignado_id: pick(i),
      nombre: o.nombre, valor: o.valor, moneda: "USD", estado: "activo",
      probabilidad_cierre: [20, 40, 60, 75, 90][Math.min(o.etapa, 4)],
      fecha_esperada_cierre: fecha,
    }).select("id").single();
    if (ins.error) throw ins.error;
    void dias;
    created++;
    console.log(`  · op "${o.nombre}" → ${etapa.nombre}`);
  }

  console.log(`\n✓ Listo. ${empIds.length} empresas, ${OPS.length} ops definidas, ${created} nuevas.`);
}

main().catch((e) => { console.error("Seed falló:", e); process.exit(1); });
