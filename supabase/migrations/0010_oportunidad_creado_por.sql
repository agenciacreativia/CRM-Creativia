-- ============================================================
-- 0010 — Track who created an opportunity.
-- ============================================================

ALTER TABLE public.oportunidad
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES public.usuario(id);
