// k6 — Soak test: carga sostenida moderada por tiempo largo.
//
// Objetivo: detectar memory leaks, conexiones a Supabase que no se liberan,
// degradación de latencia con el tiempo. Diferente del stress test (que
// busca el techo); este busca "puedo correr 30 min a X RPS sin degradar".
//
// Por default: 30 RPS durante 30 min (perfil realista de un día normal con
// 300 agencias activas usando ~6% del tiempo).
//
// Uso:
//   k6 run scripts/load-test/soak-test.js
//   k6 run -e DURATION=2h -e RPS=50 scripts/load-test/soak-test.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://creativia.turisteacrm.com";
const SUBDOMINIO = __ENV.SUBDOMINIO || "creativia";
const RPS = Number(__ENV.RPS || 30);
const DURATION = __ENV.DURATION || "30m";

const latencia = new Trend("custom_latencia_ms", true);

export const options = {
  scenarios: {
    soak: {
      executor: "constant-arrival-rate",
      rate: RPS,
      timeUnit: "1s",
      duration: DURATION,
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    // Más laxo que stress (queremos ver degradación a lo largo del tiempo,
    // no romper en el primer pico).
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<3000"],
  },
};

function suffix() { return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }

export default function () {
  const payload = {
    nombre: `Soak ${suffix()}`,
    email: `soak+${suffix()}@example.com`,
    pipeline: "Ventas",
    etapa: "Cotizado",
    valor: 5000,
    moneda: "USD",
    formulario: "soak_test",
  };
  const res = http.post(`${BASE_URL}/api/leads/${SUBDOMINIO}`, JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "POST /api/leads (soak)" },
  });
  latencia.add(res.timings.duration);
  check(res, { "ok": (r) => r.status === 200 });
  sleep(0.1);
}
