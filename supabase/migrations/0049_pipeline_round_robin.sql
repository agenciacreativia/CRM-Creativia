-- 0049 — Distribución round-robin con pesos por pipeline (embudo).
--
-- Configurás N asesores por pipeline con un peso (1-100). Los pesos del
-- pipeline deben sumar 100. Cuando entra un lead web sin asesor explícito,
-- el endpoint llama una RPC que aplica Smooth Weighted Round-Robin (el
-- mismo algoritmo de nginx) — el asesor con mayor current_weight es elegido
-- y su contador se decrementa por el total. Eso da distribución suave (no
-- a oleadas) y respeta los pesos.
--
-- Tablas:
--   pipeline_asesor          — config: peso por (pipeline, asesor)
--   pipeline_asesor_estado   — runtime: current_weight para el algoritmo

create table if not exists public.pipeline_asesor (
    pipeline_id   uuid not null references public.pipeline(id) on delete cascade,
    usuario_id    uuid not null references public.usuario(id) on delete cascade,
    peso          int  not null check (peso > 0 and peso <= 100),
    activo        boolean not null default true,
    creado_en     timestamptz not null default now(),
    primary key (pipeline_id, usuario_id)
);

create index if not exists pipeline_asesor_pipeline_idx
    on public.pipeline_asesor (pipeline_id) where activo;

create table if not exists public.pipeline_asesor_estado (
    pipeline_id        uuid not null references public.pipeline(id) on delete cascade,
    usuario_id         uuid not null references public.usuario(id) on delete cascade,
    -- current_weight del algoritmo Smooth Weighted Round-Robin (nginx).
    -- Se incrementa por peso en cada paso y se decrementa por total al ser
    -- elegido. Puede ser negativo entre rondas.
    acumulado          int  not null default 0,
    ultima_asignacion  timestamptz,
    primary key (pipeline_id, usuario_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.pipeline_asesor enable row level security;
alter table public.pipeline_asesor_estado enable row level security;

create policy pipeline_asesor_select on public.pipeline_asesor
  for select to authenticated
  using (
    exists (select 1 from public.pipeline p
            where p.id = pipeline_id and p.tenant_id = public.current_tenant_id())
  );

create policy pipeline_asesor_write on public.pipeline_asesor
  for all to authenticated
  using (
    exists (select 1 from public.pipeline p
            where p.id = pipeline_id and p.tenant_id = public.current_tenant_id())
  )
  with check (
    exists (select 1 from public.pipeline p
            where p.id = pipeline_id and p.tenant_id = public.current_tenant_id())
  );

create policy pipeline_asesor_estado_select on public.pipeline_asesor_estado
  for select to authenticated
  using (
    exists (select 1 from public.pipeline p
            where p.id = pipeline_id and p.tenant_id = public.current_tenant_id())
  );

-- ── RPC: siguiente asesor por round-robin con pesos ────────────────────────
--
-- Algoritmo: Smooth Weighted Round-Robin (https://nginx.org/en/docs/http/load_balancing.html).
-- En transacción para evitar dos requests concurrentes que tomen el mismo
-- asesor antes de actualizar el estado.

create or replace function public.pipeline_siguiente_asesor(p_pipeline_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_total_peso int;
    v_elegido    uuid;
begin
    -- Lock pesimista: serializamos asignaciones para este pipeline.
    perform 1 from public.pipeline where id = p_pipeline_id for update;

    select coalesce(sum(peso), 0) into v_total_peso
    from public.pipeline_asesor
    where pipeline_id = p_pipeline_id and activo;
    if v_total_peso = 0 then return null; end if;

    -- Asegurar que cada asesor activo tenga fila de estado.
    insert into public.pipeline_asesor_estado (pipeline_id, usuario_id, acumulado)
    select p_pipeline_id, pa.usuario_id, 0
      from public.pipeline_asesor pa
     where pa.pipeline_id = p_pipeline_id and pa.activo
    on conflict do nothing;

    -- Paso 1: a cada acumulado se le suma su peso.
    update public.pipeline_asesor_estado e
       set acumulado = e.acumulado + pa.peso
      from public.pipeline_asesor pa
     where e.pipeline_id = p_pipeline_id
       and pa.pipeline_id = p_pipeline_id
       and pa.usuario_id = e.usuario_id
       and pa.activo;

    -- Paso 2: elegir el de mayor acumulado.
    select e.usuario_id into v_elegido
      from public.pipeline_asesor_estado e
      join public.pipeline_asesor pa
        on pa.pipeline_id = e.pipeline_id and pa.usuario_id = e.usuario_id and pa.activo
     where e.pipeline_id = p_pipeline_id
     order by e.acumulado desc, e.usuario_id  -- desempate determinístico
     limit 1;

    if v_elegido is null then return null; end if;

    -- Paso 3: al elegido, restarle el total.
    update public.pipeline_asesor_estado
       set acumulado = acumulado - v_total_peso,
           ultima_asignacion = now()
     where pipeline_id = p_pipeline_id and usuario_id = v_elegido;

    return v_elegido;
end;
$$;

revoke all on function public.pipeline_siguiente_asesor(uuid) from public;
grant execute on function public.pipeline_siguiente_asesor(uuid) to authenticated, service_role;
