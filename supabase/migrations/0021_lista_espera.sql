-- ============================================================
-- 0021 — Soft caps with a "waiting list" (lista de espera).
--
--  When a tenant exceeds the record cap of its plan, the new row
--  is still SAVED but flagged en_espera = TRUE, which hides it from
--  every normal read (RLS). When the tenant upgrades to a plan with
--  a higher cap, held rows are released oldest-first automatically.
--
--  · en_espera column on empresa / contacto / oportunidad / producto
--  · SELECT policies hide held rows
--  · BEFORE INSERT trigger flags rows over the cap
--  · liberar_lista_espera() releases held rows up to the new cap
--  · tenant plan_id change auto-releases
-- ============================================================

ALTER TABLE public.empresa     ADD COLUMN IF NOT EXISTS en_espera BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.contacto    ADD COLUMN IF NOT EXISTS en_espera BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.oportunidad ADD COLUMN IF NOT EXISTS en_espera BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.producto    ADD COLUMN IF NOT EXISTS en_espera BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_empresa_espera     ON public.empresa (tenant_id, en_espera);
CREATE INDEX IF NOT EXISTS idx_contacto_espera    ON public.contacto (tenant_id, en_espera);
CREATE INDEX IF NOT EXISTS idx_oportunidad_espera ON public.oportunidad (tenant_id, en_espera);
CREATE INDEX IF NOT EXISTS idx_producto_espera    ON public.producto (tenant_id, en_espera);

-- ---- Hide held rows from normal reads ----
DROP POLICY IF EXISTS empresa_select ON public.empresa;
CREATE POLICY empresa_select ON public.empresa
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND en_espera = FALSE);

DROP POLICY IF EXISTS contacto_select ON public.contacto;
CREATE POLICY contacto_select ON public.contacto
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND en_espera = FALSE);

DROP POLICY IF EXISTS oportunidad_select ON public.oportunidad;
CREATE POLICY oportunidad_select ON public.oportunidad
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND en_espera = FALSE
    AND (public.is_admin() OR asignado_id = auth.uid())
  );

DROP POLICY IF EXISTS producto_select ON public.producto;
CREATE POLICY producto_select ON public.producto
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND en_espera = FALSE);

-- ---- BEFORE INSERT: flag rows over the plan cap ----
CREATE OR REPLACE FUNCTION public.aplicar_lista_espera()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap      INTEGER;
  visibles INTEGER;
  clave    TEXT := TG_ARGV[0];   -- limit suffix: empresas / contactos / ...
BEGIN
  SELECT (p.limites ->> ('max_' || clave))::int
    INTO cap
    FROM public.tenant t
    JOIN public.plan p ON p.id = t.plan_id
   WHERE t.id = NEW.tenant_id;

  -- No plan or unlimited (null) cap → always visible.
  IF cap IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1 AND en_espera = false', TG_TABLE_NAME)
    INTO visibles USING NEW.tenant_id;

  IF visibles >= cap THEN
    NEW.en_espera := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_espera_empresa ON public.empresa;
CREATE TRIGGER trg_espera_empresa BEFORE INSERT ON public.empresa
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_lista_espera('empresas');

DROP TRIGGER IF EXISTS trg_espera_contacto ON public.contacto;
CREATE TRIGGER trg_espera_contacto BEFORE INSERT ON public.contacto
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_lista_espera('contactos');

DROP TRIGGER IF EXISTS trg_espera_oportunidad ON public.oportunidad;
CREATE TRIGGER trg_espera_oportunidad BEFORE INSERT ON public.oportunidad
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_lista_espera('oportunidades');

DROP TRIGGER IF EXISTS trg_espera_producto ON public.producto;
CREATE TRIGGER trg_espera_producto BEFORE INSERT ON public.producto
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_lista_espera('productos');

-- ---- Release held rows up to the (new) cap, oldest first ----
CREATE OR REPLACE FUNCTION public.liberar_lista_espera(p_tenant UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tbl      TEXT;
  clave    TEXT;
  cap      INTEGER;
  visibles INTEGER;
  libres   INTEGER;
BEGIN
  FOR tbl, clave IN
    SELECT * FROM (VALUES
      ('empresa', 'empresas'),
      ('contacto', 'contactos'),
      ('oportunidad', 'oportunidades'),
      ('producto', 'productos')
    ) AS x(t, c)
  LOOP
    SELECT (p.limites ->> ('max_' || clave))::int
      INTO cap
      FROM public.tenant t
      JOIN public.plan p ON p.id = t.plan_id
     WHERE t.id = p_tenant;

    IF cap IS NULL THEN
      -- Unlimited (or no plan): release everything held.
      EXECUTE format('UPDATE public.%I SET en_espera = false WHERE tenant_id = $1 AND en_espera = true', tbl)
        USING p_tenant;
    ELSE
      EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1 AND en_espera = false', tbl)
        INTO visibles USING p_tenant;
      libres := cap - visibles;
      IF libres > 0 THEN
        EXECUTE format(
          'UPDATE public.%I SET en_espera = false WHERE id IN (' ||
          'SELECT id FROM public.%I WHERE tenant_id = $1 AND en_espera = true ORDER BY creado_en ASC LIMIT %s)',
          tbl, tbl, libres
        ) USING p_tenant;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ---- Auto-release when a tenant's plan changes (e.g. upgrade) ----
CREATE OR REPLACE FUNCTION public.on_tenant_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    PERFORM public.liberar_lista_espera(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_plan_change ON public.tenant;
CREATE TRIGGER trg_tenant_plan_change AFTER UPDATE OF plan_id ON public.tenant
  FOR EACH ROW EXECUTE FUNCTION public.on_tenant_plan_change();
