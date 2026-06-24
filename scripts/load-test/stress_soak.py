"""
Soak test — carga sostenida moderada por tiempo largo.

Detecta:
  - Memory leaks (latencia subiendo con el tiempo)
  - Conexiones que no liberan (errores crecen)
  - Degradacion gradual (p95 minuto a minuto se va para arriba)

Default: 5 RPS sostenidos x 10 minutos = 3000 reqs total.

Por minuto reporta p50/p95/error_rate. Si la tendencia es creciente,
hay un problema. Si es plana, el sistema esta sano.

Uso:
  python stress_soak.py
  python stress_soak.py --rps 10 --minutes 15
"""
import argparse
import asyncio
import json
import sys
import time
import uuid
from pathlib import Path
import httpx

BASE_URL = 'https://creativia.turisteacrm.com'
SUBDOMAIN = 'creativia'
LT_MARKER = '[LT]'
ENV_PATH = Path('D:/CREATIVIA/CRM-CREATIVIA-TURISTEA/apps/web/.env.local')


def load_env():
    env = {}
    for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()
    return env


async def webhook_one(client, idx):
    t0 = time.perf_counter()
    try:
        r = await client.post(
            f'{BASE_URL}/api/leads/{SUBDOMAIN}',
            headers={'Content-Type': 'application/json'},
            json={
                'nombre': f'{LT_MARKER} Soak {idx}',
                'email': f'lt_soak_{idx}_{uuid.uuid4().hex[:6]}@example.com',
                'pipeline': 'Ventas',
                'etapa': 'Cotizado',
                'valor': 1000 + (idx % 100),
                'formulario': 'soak',
            },
            timeout=30.0,
        )
        return (time.perf_counter() - t0) * 1000, r.status_code
    except Exception as e:
        return (time.perf_counter() - t0) * 1000, 'EXC'


def pct(sorted_list, p):
    if not sorted_list:
        return 0
    return sorted_list[min(len(sorted_list) - 1, int(len(sorted_list) * p / 100))]


async def main(args):
    target_rps = args.rps
    minutes = args.minutes
    total_reqs = target_rps * 60 * minutes
    interval = 1.0 / target_rps  # segundos entre cada lanzamiento

    print(f'SOAK TEST')
    print(f'  Target: {target_rps} RPS x {minutes} min = {total_reqs} reqs total')
    print(f'  Endpoint: POST {BASE_URL}/api/leads/{SUBDOMAIN}')
    print(f'  Limpieza al final: nombre LIKE \'{LT_MARKER}%\'')
    print()

    per_minute = {}  # minuto -> {lat: [], errors, total}

    limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
    async with httpx.AsyncClient(limits=limits) as client:
        # Pre-warm: 3 reqs para abrir conexion
        for i in range(3):
            await webhook_one(client, -1 - i)

        t_start = time.perf_counter()
        tasks = []
        for i in range(total_reqs):
            tasks.append(asyncio.create_task(webhook_one(client, i)))
            # esperar antes de lanzar el siguiente para mantener RPS
            await asyncio.sleep(interval)

            # Cada minuto, recolectar resultados completados
            elapsed_s = time.perf_counter() - t_start
            cur_min = int(elapsed_s // 60)
            if cur_min not in per_minute:
                per_minute[cur_min] = {'lat': [], 'errors': 0, 'rl': 0, 'total': 0}
                # Reportar minuto anterior si existe
                prev = cur_min - 1
                if prev in per_minute:
                    pm = per_minute[prev]
                    s = sorted(pm['lat'])
                    print(f'  min {prev:2d}: n={pm["total"]:3d} | '
                          f'p50={pct(s,50):4.0f}ms p95={pct(s,95):4.0f}ms p99={pct(s,99):4.0f}ms | '
                          f'errors={pm["errors"]} | rate-limited={pm["rl"]}')

        # Esperar a que terminen los pendientes
        results = await asyncio.gather(*tasks)
        wall_total = time.perf_counter() - t_start

        # Clasificar
        for i, (ms, status) in enumerate(results):
            minute = int((i * interval) // 60)
            if minute not in per_minute:
                per_minute[minute] = {'lat': [], 'errors': 0, 'rl': 0, 'total': 0}
            per_minute[minute]['lat'].append(ms)
            per_minute[minute]['total'] += 1
            if status == 429:
                per_minute[minute]['rl'] += 1
            elif status != 200:
                per_minute[minute]['errors'] += 1

        # Reportar ultimo minuto
        last = max(per_minute.keys())
        pm = per_minute[last]
        s = sorted(pm['lat'])
        print(f'  min {last:2d}: n={pm["total"]:3d} | '
              f'p50={pct(s,50):4.0f}ms p95={pct(s,95):4.0f}ms p99={pct(s,99):4.0f}ms | '
              f'errors={pm["errors"]} | rate-limited={pm["rl"]}')

        # Resumen global
        all_lat = sorted([m for pm in per_minute.values() for m in pm['lat']])
        total_errors = sum(pm['errors'] for pm in per_minute.values())
        total_rl = sum(pm['rl'] for pm in per_minute.values())
        total = sum(pm['total'] for pm in per_minute.values())

        print()
        print('=' * 60)
        print('RESUMEN GLOBAL')
        print('=' * 60)
        print(f'  Duracion total: {wall_total:.0f}s ({wall_total/60:.1f} min)')
        print(f'  Total reqs: {total}')
        print(f'  Throughput real: {total/wall_total:.1f} RPS (target {target_rps})')
        print(f'  Errors: {total_errors} ({100*total_errors/total:.2f}%)')
        print(f'  Rate-limited: {total_rl} ({100*total_rl/total:.2f}%)')
        print(f'  Latencia: p50={pct(all_lat,50):.0f}ms p95={pct(all_lat,95):.0f}ms '
              f'p99={pct(all_lat,99):.0f}ms max={max(all_lat):.0f}ms')

        # Analisis de tendencia: comparar primer tercio vs ultimo tercio
        sorted_mins = sorted(per_minute.keys())
        if len(sorted_mins) >= 6:
            third = len(sorted_mins) // 3
            first_lat = []
            last_lat = []
            for m in sorted_mins[:third]:
                first_lat.extend(per_minute[m]['lat'])
            for m in sorted_mins[-third:]:
                last_lat.extend(per_minute[m]['lat'])
            first_lat.sort()
            last_lat.sort()
            p95_first = pct(first_lat, 95)
            p95_last = pct(last_lat, 95)
            degradacion = ((p95_last - p95_first) / p95_first * 100) if p95_first > 0 else 0
            print()
            print('  Tendencia (primer tercio vs ultimo tercio):')
            print(f'    p95 inicio: {p95_first:.0f}ms')
            print(f'    p95 final:  {p95_last:.0f}ms')
            if degradacion > 30:
                print(f'    WARN: degradacion del {degradacion:.0f}% — posible memory leak / conn pool stale')
            elif degradacion < -10:
                print(f'    Mejora del {-degradacion:.0f}% — warmup en progreso')
            else:
                print(f'    Estable ({degradacion:+.0f}%) — sistema sano')

    # Limpieza
    print()
    print('Limpieza de records [LT]...')
    env = load_env()
    supa_url = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
    sk = env['SUPABASE_SERVICE_ROLE_KEY']
    headers = {'apikey': sk, 'Authorization': f'Bearer {sk}'}
    tenant_id = '33333333-3333-3333-3333-333333333333'
    async with httpx.AsyncClient() as c:
        for table in ['oportunidad', 'contacto', 'empresa']:
            try:
                r = await c.delete(
                    f'{supa_url}/rest/v1/{table}?tenant_id=eq.{tenant_id}&nombre=like.%5BLT%5D%25',
                    headers=headers, timeout=120.0,
                )
                print(f'  {table:12s} -> HTTP {r.status_code}')
            except Exception as e:
                print(f'  {table:12s} -> ERR {e}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--rps', type=int, default=5)
    ap.add_argument('--minutes', type=int, default=10)
    asyncio.run(main(ap.parse_args()))
