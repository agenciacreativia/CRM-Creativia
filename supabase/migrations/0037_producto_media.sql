-- 0037 — Product media (cover image + attachments) and 30-day soft delete
-- for opportunities. Deleted opportunities stop counting toward plan caps.

-- ---- Product cover image + attachments ----
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS imagen_path TEXT;
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS adjuntos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'propio'
  CHECK (origen IN ('propio','turistea'));
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS catalogo_origen_id UUID; -- referencia al producto Turistea original
CREATE INDEX IF NOT EXISTS idx_producto_origen ON public.producto(tenant_id, origen);

-- ---- Opportunity soft delete + 30-day retention ----
ALTER TABLE public.oportunidad ADD COLUMN IF NOT EXISTS eliminada_en TIMESTAMPTZ;

-- Auto-set eliminada_en when state moves to "eliminado".
CREATE OR REPLACE FUNCTION public.touch_eliminada_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'eliminado' AND OLD.estado IS DISTINCT FROM 'eliminado' THEN
    NEW.eliminada_en := NOW();
  ELSIF NEW.estado <> 'eliminado' THEN
    NEW.eliminada_en := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_oportunidad_eliminada_en ON public.oportunidad;
CREATE TRIGGER trg_oportunidad_eliminada_en BEFORE UPDATE ON public.oportunidad
  FOR EACH ROW EXECUTE FUNCTION public.touch_eliminada_en();

-- Make `en_espera` trigger ignore eliminada rows (they don't count toward cap).
CREATE OR REPLACE FUNCTION public.aplicar_lista_espera()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cap INTEGER; visibles INTEGER; clave TEXT := TG_ARGV[0];
BEGIN
  SELECT (p.limites ->> ('max_' || clave))::int INTO cap
    FROM public.tenant t JOIN public.plan p ON p.id = t.plan_id
   WHERE t.id = NEW.tenant_id;
  IF cap IS NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'oportunidad' THEN
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE tenant_id = $1 AND en_espera = false AND estado <> ''eliminado''',
      TG_TABLE_NAME
    ) INTO visibles USING NEW.tenant_id;
  ELSE
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE tenant_id = $1 AND en_espera = false',
      TG_TABLE_NAME
    ) INTO visibles USING NEW.tenant_id;
  END IF;

  IF visibles >= cap THEN NEW.en_espera := TRUE; END IF;
  RETURN NEW;
END;
$$;

-- ---- Saved views: support extra columns + filter spec ----
ALTER TABLE public.vista_guardada ADD COLUMN IF NOT EXISTS columnas JSONB;
ALTER TABLE public.vista_guardada ADD COLUMN IF NOT EXISTS aplica_columnas BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- Email-send lists (campañas) ----
CREATE TABLE IF NOT EXISTS public.lista_envio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  filtros     JSONB NOT NULL DEFAULT '{}'::jsonb,
  contactos   INTEGER NOT NULL DEFAULT 0,
  creado_por  UUID REFERENCES public.usuario(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.lista_envio ENABLE ROW LEVEL SECURITY;
CREATE POLICY lista_envio_select ON public.lista_envio FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY lista_envio_write ON public.lista_envio FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ---- UTM fields on opportunity (attribution / campaign performance) ----
ALTER TABLE public.oportunidad
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- ---- Bucket de imágenes de producto (creado vía API, no SQL) ----
-- (manual: create bucket 'productos' in Supabase Storage if it doesn't exist)
