-- ============================================================
-- 0029 — Passengers per opportunity. Captured up front (the
--        client provides their data); each can carry a document
--        (passport/ID image or PDF). On reservation, the data +
--        documents are sent to Turistea.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pasajero (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id    UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  documento         TEXT,
  fecha_nacimiento  DATE,
  tipo              TEXT NOT NULL DEFAULT 'adulto' CHECK (tipo IN ('adulto', 'nino', 'bebe')),
  email             TEXT,
  telefono          TEXT,
  archivo_path      TEXT,        -- ruta en el storage del CRM (bucket documentos)
  archivo_nombre    TEXT,
  archivo_mime      TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pasajero_oportunidad ON public.pasajero (oportunidad_id, creado_en);

ALTER TABLE public.pasajero ENABLE ROW LEVEL SECURITY;

CREATE POLICY pasajero_select ON public.pasajero
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY pasajero_write ON public.pasajero
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
