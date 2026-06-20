-- 0046 — UTMs y trazabilidad de origen para leads web.
--
-- Cada oportunidad creada vía /api/leads/[subdominio] guarda:
--   utms        jsonb con utm_source/medium/campaign/term/content + gclid/fbclid/etc.
--   origen_url  URL donde se llenó el form (window.location.href)
--   referrer    document.referrer (de dónde llegó el usuario)
--   landing     primera URL visitada de la sesión (si el sitio la setea en una cookie)
--
-- Todos nullables — formularios antiguos siguen funcionando sin cambios.

alter table public.oportunidad
    add column if not exists utms       jsonb,
    add column if not exists origen_url text,
    add column if not exists referrer   text,
    add column if not exists landing    text;

-- Index ligero para reportes por fuente/campaña.
create index if not exists oportunidad_utms_source_idx
    on public.oportunidad ((utms->>'utm_source'));
create index if not exists oportunidad_utms_campaign_idx
    on public.oportunidad ((utms->>'utm_campaign'));
