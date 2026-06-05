-- ============================================================
-- 0031 — Commercial layer: per-advisor commission config, and a
--        tenant config blob (RFM thresholds + exchange rate).
-- ============================================================

ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS rol_comercial TEXT
    CHECK (rol_comercial IN ('counter_jr', 'counter_sr', 'vendedor_externo', 'gerente')),
  ADD COLUMN IF NOT EXISTS comision_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_mensual NUMERIC(15, 2);

-- Tenant config: { rfm: { oro, plata }, tipo_cambio: { moneda, valor } }
ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
