// k6 — Spike test: pico abrupto de tráfico, recuperación.
//
// Simula un caso real: 300 agencias reciben simultáneamente una notificación
// push de un nuevo plan y todas hacen clic dentro de los mismos 30 segundos
// → 10 RPS de baseline saltan a 100+ RPS por 30s, después baja.
//
// Buscamos: ¿el server aguanta el pico? ¿se recupera rápido sin quedar lento?
//
// Uso:
//   k6 run scripts/load-test/spike-test.js

import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://creativia.turisteacrm.com";
const SUBDOMINIO = __ENV.SUBDOMINIO || "creativia";

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: "30s", target: 10 },    // baseline
        { duration: "10s", target: 200 },   // SPIKE: 200 RPS
        { duration: "30s", target: 200 },   // sostener spike
        { duration: "10s", target: 10 },    // bajar
        { duration: "30s", target: 10 },    // ¿se recupera?
      ],
    },
  },
  thresholds: {
    // Durante el spike toleramos algo más; pero la recuperación tiene que
    // volver a niveles normales — si NO se recupera, el server quedó dañado.
    http_req_failed: ["rate<0.05"],
    "http_req_duration{stage:recovery}": ["p(95)<2000"],
  },
};

function suffix() { return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }

export default function () {
  const res = http.post(
    `${BASE_URL}/api/leads/${SUBDOMINIO}`,
    JSON.stringify({
      nombre: `Spike ${suffix()}`,
      email: `spike+${suffix()}@example.com`,
      pipeline: "Ventas",
      etapa: "Cotizado",
      valor: 3000,
      formulario: "spike_test",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, { "ok": (r) => r.status === 200 });
}
