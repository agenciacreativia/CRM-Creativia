-- ============================================================
-- 0014 — Toggle: auto-push scheduled CRM activities to the
--        user's Google Calendar. On by default.
-- ============================================================

ALTER TABLE public.cuenta_google
  ADD COLUMN IF NOT EXISTS sync_actividades BOOLEAN NOT NULL DEFAULT true;
