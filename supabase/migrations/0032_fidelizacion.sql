-- ============================================================
-- 0032 — Loyalty / attribution fields.
--   · contacto.fecha_nacimiento  — birthday campaigns.
--   · pasajero.doc_vencimiento   — passport/visa expiry alerts.
--   · oportunidad.estrategia     — commercial-strategy attribution.
-- ============================================================

ALTER TABLE public.contacto    ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE public.pasajero    ADD COLUMN IF NOT EXISTS doc_vencimiento DATE;
ALTER TABLE public.oportunidad ADD COLUMN IF NOT EXISTS estrategia TEXT;
