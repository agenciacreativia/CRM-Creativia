-- 0038 — API usage limits per key (monthly counter + plan-aware cap).
ALTER TABLE public.api_key ADD COLUMN IF NOT EXISTS limite_mes INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE public.api_key ADD COLUMN IF NOT EXISTS usados_mes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.api_key ADD COLUMN IF NOT EXISTS mes_actual TEXT;

-- Enforce one active API key per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_api_key_activa_por_tenant
  ON public.api_key(tenant_id) WHERE revocada = false;
