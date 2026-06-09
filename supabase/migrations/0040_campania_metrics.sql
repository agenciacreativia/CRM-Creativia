-- 0040_campania_metrics.sql
--
-- Reporte detallado de campaña (issue #6 del QA desktop):
-- las columnas existentes solo registraban `enviados` (count). Si todos los
-- correos fallaban, la card mostraba "0 enviado(s)" sin explicar por qué.
-- Agregamos:
--   - `errores`             : cuántos destinatarios fallaron al enviar
--   - `destinatarios_total` : a cuántos contactos estaba dirigida la campaña
--                             (snapshot al momento del envío)
--   - `error_resumen`       : última razón de error registrada (truncado a 500)
--
-- Estas columnas son aditivas; no rompen ningún read existente y los inserts
-- viejos seguían funcionando con DEFAULT 0 / NULL.

ALTER TABLE public.campania
  ADD COLUMN IF NOT EXISTS errores             INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destinatarios_total INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_resumen       TEXT;

-- Sin índices nuevos: estas columnas solo se leen al renderizar el listado
-- de campañas, ya filtrado por tenant_id (existing RLS + idx_campania_tenant).
