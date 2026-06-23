# Stress / load testing — capacidad para 300 agencias

Suite de pruebas para validar que el CRM aguanta a 300 agencias usándolo
en paralelo. Las pruebas pegan a **producción** (`creativia.turisteacrm.com`)
con tráfico sintético — crean leads y oportunidades reales en la BD, así
que conviene **limpiar después** o correr contra un tenant de test.

## Requisitos

Instalar `k6` (es un binario; no requiere Node):

- Windows: `winget install k6 --source winget`
- macOS: `brew install k6`
- Linux: `sudo apt install gnupg ca-certificates && sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt update && sudo apt install k6`

Verificar: `k6 version`.

## Los 4 scripts

| Script | Mide | Cuándo correrlo |
|---|---|---|
| `webhook-leads.js` | Stress del POST público `/api/leads/[sub]` | Antes de campañas grandes / lanzamientos |
| `spike-test.js` | Recuperación tras pico abrupto | Si vas a mandar push masivos / blast email |
| `soak-test.js` | Estabilidad a las 30 min (memory leaks, pools que no liberan) | Mensual, después de cambios mayores |
| `listado-publico.js` | Rutas públicas (home, login, health) | Antes de release de UI |

## Cómo correrlos

```bash
# 1) Test rápido — ¿el endpoint responde bien con 50 usuarios concurrentes 1 min?
k6 run scripts/load-test/webhook-leads.js

# 2) Más fuerte — 100 VUs, 2 min
k6 run -e VUS=100 -e DURATION=2m scripts/load-test/webhook-leads.js

# 3) Con rate fijo — 300 RPS sostenidos por 3 min (el objetivo de 300 agencias)
k6 run -e RPS=300 -e DURATION=3m scripts/load-test/webhook-leads.js

# 4) Spike — pico abrupto y recuperación
k6 run scripts/load-test/spike-test.js

# 5) Soak — 30 RPS durante 30 min (detecta memory leaks)
k6 run scripts/load-test/soak-test.js

# 6) Rutas públicas
k6 run -e VUS=200 scripts/load-test/listado-publico.js
```

## Cómo interpretar los resultados

Al final de cada test k6 imprime un resumen. Mirá estas métricas:

| Métrica | Verde (bueno) | Amarillo | Rojo |
|---|---|---|---|
| `http_req_duration p(95)` | < 1000ms | 1000-3000ms | > 3000ms |
| `http_req_duration p(99)` | < 2000ms | 2000-5000ms | > 5000ms |
| `http_req_failed` rate | < 0.5% | 0.5-2% | > 2% |
| Throughput sostenido | matchea el RPS solicitado ±5% | el server limita el throughput | el server tira 5xx |

**Si `p(95) > 3000ms`** → el server está sufriendo, necesita o más recursos o
optimizaciones (cache, índices, rate-limit).

**Si `http_req_failed > 2%`** → algo se está cayendo: o connection pool
saturado, o el servidor está OOM (Out Of Memory), o el container está
muriendo (`docker compose logs crm` para ver).

## Antes de correr — checklist

1. **Backup**: si vas a tirar miles de leads, conviene tener un punto al
   que volver. Hacé snapshot de Supabase Dashboard o exportá los datos
   actuales si querés conservarlos.
2. **Tenant dedicado**: cargar contra el tenant que ya usás te llena la
   tabla con leads "LT…" — está pensado para limpiar después por nombre.
   Para no contaminar nada, creá un tenant `loadtest` y úsalo.
3. **Hora**: corrí los stress en horario de bajo uso. El soak puede ir
   24/7 pero ojo con la BD.
4. **Avisá al equipo**: si hay alguien usando el CRM en vivo, el spike
   les va a tirar 502 momentáneo.

## Cómo limpiar después

En el CRM admin (Supabase Dashboard → SQL editor):

```sql
-- Borrar oportunidades + contactos + empresas creados por la prueba
delete from oportunidad
 where nombre like 'Lead web: Spike%'
    or nombre like 'Lead web: Soak%'
    or nombre like 'Lead web: %loadtest%';

delete from contacto where email like 'loadtest+%@example.com';
delete from contacto where email like 'soak+%@example.com';
delete from contacto where email like 'spike+%@example.com';

delete from empresa where nombre like '[LT] Agencia%';
```

## Análisis estático — los hotspots conocidos

Estos son los puntos del código que merecen atención SI los tests muestran
degradación:

### Crítico
- **Sin rate limit en `/api/leads/[subdominio]`** (público, sin auth). Un bot
  malicioso puede saturar fácilmente. Recomendado: añadir middleware con
  límite por IP (ej. 30 req/min) usando `@upstash/ratelimit` o equivalente.

### Importante
- **Round-robin con `SELECT FOR UPDATE`** sobre la fila del pipeline.
  Serializa asignaciones de un MISMO pipeline. Si 300 agencias usan
  pipelines distintos (caso esperado), no contienden. Si todas comparten
  pipeline → bottleneck. Considera particionar.
- **`getTenantBySubdomain`** se ejecuta en cada request del CRM. Cachear
  por subdomain en memoria (ttl 5 min) sería trivial y ahorraría 1 query
  por request autenticado.
- **`listOportunidades` con embed grande** (empresa, contacto, pipeline,
  etapa, usuario, oportunidad_producto, historial_etapa). Para 300 agencias
  con miles de oportunidades cada una, conviene revisar índices y considerar
  cursor pagination si offset crece mucho.

### Recursos del server
- **Lightsail tier actual**: revisar RAM y vCPUs. Para 300 agencias con
  burst de ~50 req/s sostenidos, recomendado mínimo: 4 GB RAM / 2 vCPU.
- **Supabase plan**: el plan free tiene 60 conexiones de Postgres. El
  service_role client de Next va a abrir 1 por request. Con 50 RPS
  concurrentes ya saturás. Subir a plan Pro (200 conexiones) o usar
  PgBouncer/Supavisor (recomendado por Supabase).

## Resultados de referencia (a llenar con tus mediciones)

Cuando hayas corrido los tests, anotá acá las cifras reales para tener
baseline:

```
webhook-leads — 300 RPS / 3min
  p50:   ___ ms
  p95:   ___ ms
  p99:   ___ ms
  fallos: ___ %
  fecha: ___

spike — 200 RPS pico / 30s
  recuperación: ___ s
  fallos durante spike: ___ %
  fallos en recovery: ___ %
  fecha: ___
```

Volver a correr cada 1-2 meses para detectar regresiones.
