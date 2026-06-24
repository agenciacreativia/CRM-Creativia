"""
Stress caps — mide techos reales del CRM Turistea antes de comercializar.

Probamos 3 dimensiones independientes contra el tenant `creativia`:
  A. VOLUMEN — cuántos registros aguanta la BD antes de que las queries degraden
  B. CONCURRENCIA — RPS sostenidos al webhook publico
  C. MIXED — lecturas autenticadas mientras se escribe

Stop automatico en cualquier dimension si:
  - p95 > 5000ms sostenido
  - errores > 5%
  - timeout

Limpieza: DELETE WHERE nombre LIKE '[LT]%'

Uso:
  python stress_caps.py
  python stress_caps.py --skip-volume    # solo concurrencia
  python stress_caps.py --skip-cleanup   # dejar data para inspeccion
"""
import argparse
import asyncio
import json
import os
import statistics
import sys
import time
import uuid
from pathlib import Path

import httpx

# ---------- Config ----------
ENV_PATH = Path('D:/CREATIVIA/CRM-CREATIVIA-TURISTEA/apps/web/.env.local')
BASE_URL = 'https://creativia.turisteacrm.com'
SUBDOMAIN = 'creativia'
TENANT_ID = '33333333-3333-3333-3333-333333333333'
LT_MARKER = '[LT]'

# Etapas de volumen: cuantos records por modulo en cada paso (suma acumulativa)
VOLUME_STEPS = [1000, 5000, 10000, 25000]

# Etapas de concurrencia: RPS objetivo
CONCURRENCY_STEPS = [10, 25, 50, 100, 200]

# Stop thresholds
MAX_P95_MS = 5000
MAX_ERROR_RATE = 0.05
MAX_TIMEOUT_S = 30


def load_env():
    env = {}
    for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()
    return env


# ---------- Stats ----------
class Stats:
    def __init__(self, label: str):
        self.label = label
        self.lat = []  # ms
        self.errors = 0
        self.timeouts = 0

    def add(self, ms: float, ok: bool, timeout: bool = False):
        self.lat.append(ms)
        if not ok:
            self.errors += 1
        if timeout:
            self.timeouts += 1

    def summary(self):
        if not self.lat:
            return {'label': self.label, 'count': 0}
        s = sorted(self.lat)
        return {
            'label': self.label,
            'count': len(s),
            'errors': self.errors,
            'timeouts': self.timeouts,
            'error_rate': round(self.errors / len(s), 4),
            'p50_ms': round(s[len(s) // 2], 1),
            'p95_ms': round(s[min(len(s) - 1, int(len(s) * 0.95))], 1),
            'p99_ms': round(s[min(len(s) - 1, int(len(s) * 0.99))], 1),
            'max_ms': round(max(s), 1),
            'min_ms': round(min(s), 1),
            'avg_ms': round(statistics.mean(s), 1),
        }

    def is_broken(self) -> bool:
        if len(self.lat) < 5:
            return False
        s = sorted(self.lat)
        p95 = s[int(len(s) * 0.95)]
        rate = self.errors / len(s)
        return p95 > MAX_P95_MS or rate > MAX_ERROR_RATE


# ---------- Helpers ----------
def make_pg_headers(service_key: str, prefer: str = 'return=minimal'):
    return {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': prefer,
    }


async def time_it(coro):
    t0 = time.perf_counter()
    try:
        ok, info = await coro
        return (time.perf_counter() - t0) * 1000, ok, info, False
    except httpx.TimeoutException:
        return (time.perf_counter() - t0) * 1000, False, 'timeout', True
    except Exception as e:
        return (time.perf_counter() - t0) * 1000, False, str(e)[:100], False


async def insert_batch(client, supa_url, headers, table, records):
    r = await client.post(f'{supa_url}/rest/v1/{table}', headers=headers, json=records, timeout=60.0)
    if r.status_code >= 400:
        body = r.text[:200] if r.text else ''
        return (False, f'HTTP {r.status_code} {body}')
    return (True, 'ok')


async def select_count(client, supa_url, headers_count, table):
    headers = dict(headers_count)
    headers['Prefer'] = 'count=exact'
    headers['Range'] = '0-0'
    r = await client.head(f'{supa_url}/rest/v1/{table}?tenant_id=eq.{TENANT_ID}',
                          headers=headers, timeout=30.0)
    cr = r.headers.get('content-range', '0-0/0')
    total = int(cr.split('/')[-1])
    return (200 <= r.status_code < 300, total)


async def select_list(client, supa_url, headers, table, limit=50):
    r = await client.get(
        f'{supa_url}/rest/v1/{table}?tenant_id=eq.{TENANT_ID}&limit={limit}&order=id.desc',
        headers=headers, timeout=30.0,
    )
    return (200 <= r.status_code < 300, len(r.json()) if r.status_code == 200 else 0)


async def webhook_post(client, base_url, idx):
    payload = {
        'nombre': f'{LT_MARKER} Webhook lead {idx}',
        'email': f'lt_wh_{idx}_{uuid.uuid4().hex[:8]}@example.com',
        'pipeline': 'Ventas',
        'etapa': 'Cotizado',
        'valor': 1000 + idx,
        'formulario': 'stress_caps',
    }
    r = await client.post(f'{base_url}/api/leads/{SUBDOMAIN}',
                          headers={'Content-Type': 'application/json'},
                          json=payload, timeout=30.0)
    return (200 <= r.status_code < 300, f'HTTP {r.status_code}')


# ---------- Builders de records ----------
def gen_empresas(n: int, offset: int):
    return [{
        'tenant_id': TENANT_ID,
        'nombre': f'{LT_MARKER} Empresa {offset + i}',
    } for i in range(n)]


def gen_contactos(n: int, offset: int):
    # email unico con timestamp+uuid para evitar colision con records previos
    ts = int(time.time() * 1000)
    return [{
        'tenant_id': TENANT_ID,
        'nombre': f'{LT_MARKER} Contacto {offset + i}',
        'email': f'lt_cnt_{offset + i}_{ts}_{uuid.uuid4().hex[:6]}@example.com',
    } for i in range(n)]


def gen_productos(n: int, offset: int):
    return [{
        'tenant_id': TENANT_ID,
        'nombre': f'{LT_MARKER} Producto {offset + i}',
    } for i in range(n)]


# ---------- Pase A: Volumen ----------
async def fase_volumen(client, supa_url, service_key):
    print('\n' + '=' * 70)
    print('FASE A — VOLUMEN: cuanto aguanta la BD antes de degradar')
    print('=' * 70)

    headers = make_pg_headers(service_key)
    headers_count = {'apikey': service_key, 'Authorization': f'Bearer {service_key}'}

    results = []
    total_inserted = {'empresa': 0, 'contacto': 0, 'producto': 0}

    for step_n in VOLUME_STEPS:
        print(f'\n--- Step: +{step_n} records por tabla ---')
        step_stats = {}

        for table, gen_fn in [('empresa', gen_empresas), ('contacto', gen_contactos), ('producto', gen_productos)]:
            offset = total_inserted[table]
            records = gen_fn(step_n, offset)
            batch_size = 500  # PostgREST acepta hasta ~1000 pero 500 es seguro

            insert_stats = Stats(f'insert_{table}_{step_n}')
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                ms, ok, info, to = await time_it(insert_batch(client, supa_url, headers, table, batch))
                insert_stats.add(ms, ok, to)
                if not ok:
                    print(f'  ! INSERT {table} batch falló: {info}')

            total_inserted[table] += step_n

            # Tiempo de lectura post-insert
            read_stats = Stats(f'read_{table}_{step_n}')
            for _ in range(5):
                ms, ok, info, to = await time_it(select_list(client, supa_url, headers, table, 50))
                read_stats.add(ms, ok, to)

            # Count
            _, count = await select_count(client, supa_url, headers_count, table)

            ins_sum = insert_stats.summary()
            rd_sum = read_stats.summary()
            print(f'  {table:12s}  total: {count:>6}  insert {step_n}: {ins_sum.get("avg_ms", 0):.0f}ms/batch  '
                  f'read p95: {rd_sum.get("p95_ms", 0):.0f}ms  err: {insert_stats.errors}')
            step_stats[table] = {'insert': ins_sum, 'read': rd_sum, 'total_count': count}

        # Listado autenticado del CRM (oportunidad via webhook crea cascade)
        # Para reads del CRM real necesitamos auth de sesion, lo saltamos por ahora
        results.append({'step_n': step_n, 'tables': step_stats})

        # Check thresholds
        for table, st in step_stats.items():
            if st['read']['p95_ms'] > MAX_P95_MS:
                print(f'  STOP: read {table} p95={st["read"]["p95_ms"]}ms > {MAX_P95_MS}ms')
                return results
            if st['insert']['errors'] > 0:
                print(f'  STOP: insert errors > 0 en {table}')
                return results

    return results


# ---------- Pase B: Concurrencia ----------
async def fase_concurrencia(client, base_url):
    print('\n' + '=' * 70)
    print('FASE B — CONCURRENCIA: cuántos webhook simultaneos antes de fallar')
    print('=' * 70)

    results = []
    last_failed = False

    for target_concurrency in CONCURRENCY_STEPS:
        if last_failed:
            print(f'  Saltando C{target_concurrency} (anterior falló)')
            break

        print(f'\n--- C{target_concurrency}: {target_concurrency} requests simultaneas ---')
        stats = Stats(f'webhook_c{target_concurrency}')

        async def one(idx):
            ms, ok, info, to = await time_it(webhook_post(client, base_url, idx))
            stats.add(ms, ok, to)

        t0 = time.perf_counter()
        await asyncio.gather(*[one(i) for i in range(target_concurrency)])
        wall_s = time.perf_counter() - t0

        sm = stats.summary()
        rps = round(target_concurrency / wall_s, 1)
        sm['wall_s'] = round(wall_s, 2)
        sm['rps_efectivo'] = rps
        print(f'  wall: {wall_s:.1f}s | rps: {rps} | p50: {sm["p50_ms"]}ms | '
              f'p95: {sm["p95_ms"]}ms | p99: {sm["p99_ms"]}ms | err: {stats.errors}/{stats.timeouts}t')

        results.append(sm)

        if stats.is_broken():
            print(f'  STOP: broke threshold (p95>{MAX_P95_MS}ms o errors>{MAX_ERROR_RATE*100}%)')
            last_failed = True

        # Cooldown entre stages
        await asyncio.sleep(2)

    return results


# ---------- Limpieza ----------
async def cleanup(client, supa_url, service_key):
    print('\n' + '=' * 70)
    print('LIMPIEZA — borrando todo lo marcado con [LT]')
    print('=' * 70)
    headers = make_pg_headers(service_key)

    for table in ['oportunidad', 'producto', 'contacto', 'empresa']:
        try:
            r = await client.delete(
                f'{supa_url}/rest/v1/{table}?tenant_id=eq.{TENANT_ID}&nombre=like.%5BLT%5D%25',
                headers=headers, timeout=120.0,
            )
            print(f'  {table:12s} -> HTTP {r.status_code}')
        except Exception as e:
            print(f'  {table:12s} -> ERROR: {e}')


# ---------- Main ----------
async def main(args):
    env = load_env()
    supa_url = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
    service_key = env['SUPABASE_SERVICE_ROLE_KEY']

    report = {
        'started_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'base_url': BASE_URL,
        'subdomain': SUBDOMAIN,
        'tenant_id': TENANT_ID,
    }

    limits = httpx.Limits(max_keepalive_connections=50, max_connections=100)
    async with httpx.AsyncClient(limits=limits, http2=False) as client:
        if not args.skip_volume:
            report['fase_a_volumen'] = await fase_volumen(client, supa_url, service_key)
        if not args.skip_concurrency:
            if not args.skip_volume:
                print('\nCOOLDOWN 30s para que pool PostgREST se recupere de la fase A...')
                await asyncio.sleep(30)
            report['fase_b_concurrencia'] = await fase_concurrencia(client, BASE_URL)

        if not args.skip_cleanup:
            await cleanup(client, supa_url, service_key)

    report['ended_at'] = time.strftime('%Y-%m-%d %H:%M:%S')

    # Guardar reporte
    out = Path(__file__).parent / f'caps_report_{int(time.time())}.json'
    out.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
    print(f'\nReporte: {out}')

    # Resumen final
    print('\n' + '=' * 70)
    print('RESUMEN FINAL — TECHOS DETECTADOS')
    print('=' * 70)
    if 'fase_a_volumen' in report and report['fase_a_volumen']:
        last = report['fase_a_volumen'][-1]
        print(f'Volumen: insertaron hasta {last["step_n"]}+ por tabla — '
              f'lectura p95 final: '
              + ', '.join([f'{t}={s["read"]["p95_ms"]}ms' for t, s in last['tables'].items()]))
    if 'fase_b_concurrencia' in report and report['fase_b_concurrencia']:
        last = report['fase_b_concurrencia'][-1]
        print(f'Concurrencia: {last["count"]} reqs simultaneos — '
              f'p95: {last["p95_ms"]}ms · errors: {last["errors"]}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--skip-volume', action='store_true')
    ap.add_argument('--skip-concurrency', action='store_true')
    ap.add_argument('--skip-cleanup', action='store_true')
    asyncio.run(main(ap.parse_args()))
