-- 0048 — NIT / identificador tributario de la empresa.
--
-- Lo usamos en la card resumida de empresa del detalle de oportunidad y para
-- recibir desde el sitio web (turistea-web manda `nit` en el payload del lead).

alter table public.empresa
    add column if not exists nit text;

create index if not exists empresa_nit_idx
    on public.empresa (tenant_id, nit)
    where nit is not null;
