// k6 — Stress test de rutas públicas (sin auth).
//
// 300 agencias = 300 subdominios distintos. Mide cómo responde la home
// pública / login mientras hay carga concurrente (resolver de tenant,
// cookies, redirecciones, headers de seguridad).
//
// No prueba rutas autenticadas (requeriría JWT por VU). Para eso usar
// `mixed-workload.js` con un set de cookies de sesión.

import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL || "https://creativia.turisteacrm.com";
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || "1m";

export const options = {
  scenarios: {
    ramp: {
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
    http_req_duration: ["p(95)<1500"],
  },
};

const RUTAS = [
  "/",                              // redirige a login o landing
  "/login",                         // página de login
  "/api/health",                    // health endpoint
];

export default function () {
  for (const ruta of RUTAS) {
    const res = http.get(BASE + ruta, { tags: { name: `GET ${ruta}` } });
    check(res, { [`${ruta} responde <500`]: (r) => r.status < 500 });
  }
}
