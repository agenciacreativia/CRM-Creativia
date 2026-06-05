-- ============================================================
-- 0036 — Day-by-day itinerary on a quote (cotización).
--        Stored as JSONB on cotizacion.itinerario so it travels
--        with the quote (no extra joins to print).
-- ============================================================

ALTER TABLE public.cotizacion
  ADD COLUMN IF NOT EXISTS itinerario JSONB NOT NULL DEFAULT '[]'::jsonb;
