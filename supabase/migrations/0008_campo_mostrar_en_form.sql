-- ============================================================
-- 0008 — Custom fields: control which ones appear in the
--        create/edit popups.
--
-- Rule (per product decision):
--   • Required custom fields ALWAYS appear in the popup.
--   • Optional custom fields appear ONLY if mostrar_en_form = true.
--
-- Default false so existing optional fields stay hidden until an
-- admin explicitly opts them in.
-- ============================================================

ALTER TABLE public.campo_personalizado
  ADD COLUMN IF NOT EXISTS mostrar_en_form BOOLEAN NOT NULL DEFAULT false;

-- Required fields are implicitly always shown; flip their flag too so
-- the UI can rely on a single boolean.
UPDATE public.campo_personalizado
  SET mostrar_en_form = true
  WHERE requerido = true;
