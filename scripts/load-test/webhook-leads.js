// k6 — Stress test del webhook público de leads.
//
// Objetivo: simular 300 agencias enviando leads en paralelo y medir si el
// endpoint público /api/leads/[subdominio] aguanta sin degradar.
//
// Uso:
//   k6 run scripts/load-test/webhook-leads.js
//
// Variables (override por env):
//   BASE_URL    URL del CRM (default: https://creativia.turisteacrm.com)
//   SUBDOMINIO  tenant destino (default: creativia)
//   VUS         virtual users concurrentes (default: 50)
//   DURATION    duración del test (default: 1m)
//   RPS         rate fijo opcional, ej. RPS=300 para forzar 300 req/seg
//
// Ejemplos:
//   k6 run -e VUS=100 -e DURATION=2m scripts/load-test/webhook-leads.js
//   k6 run -e RPS=300 -e DURATION=3m scripts/load-test/webhook-leads.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://creativia.turisteacrm.com";
const SUBDOMINIO = __ENV.SUBDOMINIO || "creativia";
const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || "1m";
const RPS = Number(__ENV.RPS || 0);

const latencia = new Trend("custom_latencia_ms", true);
const oksRate = new Rate("custom_ok_rate");
const errores = new Counter("custom_errores");

// Escenarios:
//  - "rate constante" si pasás RPS: 300 reqs/seg garantizados desde un pool
//    de VUs preasignados. Bueno para "puede el server con X RPS sostenidos?"
//  - "ramping VUs" si no pasás RPS: sube de 0 a VUS en 20s, mantiene, baja.
//    Bueno para "¿cuándo empieza a sufrir?"
export const options = RPS > 0
  ? {
      scenarios: {
        constant_rps: {
          executor: "constant-arrival-rate",
          rate: RPS,
          timeUnit: "1s",
          duration: DURATION,
          preAllocatedVUs: Math.max(50, Math.ceil(RPS / 2)),
          maxVUs: Math.max(200, RPS),
        },
      },
      thresholds: {
        http_req_failed: ["rate<0.01"], // <1% fallos
        http_req_duration: ["p(95)<2000", "p(99)<5000"],
        custom_ok_rate: ["rate>0.99"],
      },
    }
  : {
      scenarios: {
        ramping: {
          executor: "ramping-vus",
          startVUs: 0,
          stages: [
            { duration: "20s", target: VUS },
            { duration: DURATION, target: VUS },
            { duration: "10s", target: 0 },
          ],
        },
      },
      thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<2000", "p(99)<5000"],
        custom_ok_rate: ["rate>0.99"],
      },
    };

// Pool de payloads variados — cada VU elige uno aleatorio para parecerse a
// tráfico real (distinto destino/pipeline/campos).
const PIPELINES = ["Ventas", "Prospección"];
const ETAPAS = ["Interesado", "Contactado", "Cotizado"];
const DESTINOS = ["Italia", "Tailandia", "Turquía", "Grecia", "Europa", "Punta Cana"];
const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla"];
const NOMBRES = ["Ana López", "Juan Pérez", "María García", "Carlos Ruiz", "Lucía Vega"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function suffix() { return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }

export default function () {
  const nombre = `${pick(NOMBRES)} ${suffix()}`;
  const payload = {
    nombre,
    email: `loadtest+${suffix()}@example.com`,
    telefono: `+57 300 ${Math.floor(1000000 + Math.random() * 8999999)}`,
    empresa: `[LT] Agencia ${Math.floor(Math.random() * 300) + 1}`,
    nit: `900.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.floor(Math.random() * 10)}`,
    mensaje: `Carga ${nombre} interesado en ${pick(DESTINOS)}.`,
    pipeline: pick(PIPELINES),
    etapa: pick(ETAPAS),
    valor: Math.floor(2000 + Math.random() * 20000),
    moneda: "USD",
    fecha_cierre: "2027-09-15",
    campos_custom: {
      destino: pick(DESTINOS),
      pax: 1 + Math.floor(Math.random() * 5),
      ciudad_origen: pick(CIUDADES),
    },
    formulario: "load_test",
    utms: { utm_source: "k6", utm_campaign: "stress-test" },
    origen_url: "https://app.turistea.com/test",
  };

  const res = http.post(`${BASE_URL}/api/leads/${SUBDOMINIO}`, JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "POST /api/leads" },
  });

  latencia.add(res.timings.duration);
  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "body.ok === true": (r) => { try { return JSON.parse(r.body).ok === true; } catch { return false; } },
    "respuesta < 5s": (r) => r.timings.duration < 5000,
  });
  oksRate.add(ok);
  if (!ok) errores.add(1);

  // Pequeña pausa para no saturar localmente. En modo RPS k6 maneja el spacing solo.
  if (RPS === 0) sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  const m = data.metrics;
  const p = (n) => Math.round(n);
  const summary = {
    "Test": "webhook-leads",
    "Endpoint": `${BASE_URL}/api/leads/${SUBDOMINIO}`,
    "Total requests": m.http_reqs.values.count,
    "Throughput (req/s)": p(m.http_reqs.values.rate),
    "OK rate": ((m.custom_ok_rate?.values.rate ?? 0) * 100).toFixed(2) + "%",
    "Latencia p50 (ms)": p(m.http_req_duration.values["p(50)"]),
    "Latencia p95 (ms)": p(m.http_req_duration.values["p(95)"]),
    "Latencia p99 (ms)": p(m.http_req_duration.values["p(99)"]),
    "Latencia max (ms)": p(m.http_req_duration.values.max),
    "Fallos HTTP": m.http_req_failed.values.passes,
    "Errores app (body.ok=false)": m.custom_errores?.values.count ?? 0,
  };
  console.log("\n══════════════════════════════════");
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(30)} ${v}`);
  console.log("══════════════════════════════════\n");
  return { stdout: "" };
}
