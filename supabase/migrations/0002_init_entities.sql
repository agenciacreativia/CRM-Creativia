-- ============================================================
-- 0002_init_entities.sql
-- All tenant-scoped tables. Every table has tenant_id.
-- ============================================================

-- ------------------------------------------------------------
-- usuario: extends auth.users with tenant context + rol
-- ------------------------------------------------------------
CREATE TABLE public.usuario (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  email             TEXT NOT NULL,
  rol               TEXT NOT NULL CHECK (rol IN ('admin','asesor')),
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  idioma_preferido  TEXT NOT NULL DEFAULT 'es' CHECK (idioma_preferido IN ('es','en')),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso     TIMESTAMPTZ
);

CREATE INDEX idx_usuario_tenant ON public.usuario(tenant_id);
CREATE INDEX idx_usuario_email ON public.usuario(email);
CREATE TRIGGER trg_usuario_updated_at
  BEFORE UPDATE ON public.usuario
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- empresa
-- ------------------------------------------------------------
CREATE TABLE public.empresa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  origen          TEXT CHECK (origen IN ('web','referencia','cold_call','evento','otro')),
  telefono        TEXT,
  email           TEXT,
  sitio_web       TEXT,
  pais            TEXT,
  ciudad          TEXT,
  descripcion     TEXT,
  estado_empresa  TEXT NOT NULL DEFAULT 'prospecto'
                  CHECK (estado_empresa IN ('prospecto','cliente','inactivo')),
  campos_custom   JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_por      UUID REFERENCES public.usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);

CREATE INDEX idx_empresa_tenant ON public.empresa(tenant_id);
CREATE INDEX idx_empresa_estado ON public.empresa(tenant_id, estado_empresa);
CREATE INDEX idx_empresa_origen ON public.empresa(tenant_id, origen);
CREATE INDEX idx_empresa_custom_gin ON public.empresa USING GIN (campos_custom);
CREATE TRIGGER trg_empresa_updated_at
  BEFORE UPDATE ON public.empresa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- contacto
-- ------------------------------------------------------------
CREATE TABLE public.contacto (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  empresa_id          UUID NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  cargo               TEXT,
  email               TEXT NOT NULL,
  telefono            TEXT,
  telefono_whatsapp   TEXT,
  origen              TEXT CHECK (origen IN ('empresa','linkedin','cold_call','evento','otro')),
  descripcion         TEXT,
  campos_custom       JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_por          UUID REFERENCES public.usuario(id),
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacto_tenant ON public.contacto(tenant_id);
CREATE INDEX idx_contacto_empresa ON public.contacto(empresa_id);
CREATE INDEX idx_contacto_email ON public.contacto(tenant_id, email);
CREATE INDEX idx_contacto_custom_gin ON public.contacto USING GIN (campos_custom);
CREATE TRIGGER trg_contacto_updated_at
  BEFORE UPDATE ON public.contacto
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- pipeline + etapa_pipeline
-- ------------------------------------------------------------
CREATE TABLE public.pipeline (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  es_default    BOOLEAN NOT NULL DEFAULT FALSE,
  creado_por    UUID REFERENCES public.usuario(id),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);
CREATE INDEX idx_pipeline_tenant ON public.pipeline(tenant_id);

CREATE TABLE public.etapa_pipeline (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  pipeline_id         UUID NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  orden               INTEGER NOT NULL DEFAULT 0,
  dias_maximo_alerta  INTEGER,
  puede_editar        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pipeline_id, nombre),
  UNIQUE (pipeline_id, orden)
);
CREATE INDEX idx_etapa_tenant ON public.etapa_pipeline(tenant_id);
CREATE INDEX idx_etapa_pipeline ON public.etapa_pipeline(pipeline_id, orden);

-- ------------------------------------------------------------
-- motivo_perdida
-- ------------------------------------------------------------
CREATE TABLE public.motivo_perdida (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  creado_por  UUID REFERENCES public.usuario(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);
CREATE INDEX idx_motivo_tenant ON public.motivo_perdida(tenant_id);

-- ------------------------------------------------------------
-- oportunidad
-- ------------------------------------------------------------
CREATE TABLE public.oportunidad (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  empresa_id            UUID NOT NULL REFERENCES public.empresa(id) ON DELETE RESTRICT,
  contacto_id           UUID NOT NULL REFERENCES public.contacto(id) ON DELETE RESTRICT,
  pipeline_id           UUID NOT NULL REFERENCES public.pipeline(id) ON DELETE RESTRICT,
  etapa_id              UUID NOT NULL REFERENCES public.etapa_pipeline(id) ON DELETE RESTRICT,
  asignado_id           UUID REFERENCES public.usuario(id) ON DELETE SET NULL,
  motivo_perdida_id     UUID REFERENCES public.motivo_perdida(id),
  nombre                TEXT NOT NULL,
  valor                 NUMERIC(15, 2),
  moneda                TEXT DEFAULT 'USD' CHECK (moneda IN ('USD','ARS','EUR','MXN','COP','CLP','PEN','BRL')),
  estado                TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','ganado','perdido','eliminado')),
  probabilidad_cierre   INTEGER CHECK (probabilidad_cierre BETWEEN 0 AND 100),
  fecha_esperada_cierre DATE,
  fecha_entrado_etapa   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observaciones_perdida TEXT,
  descripcion           TEXT,
  campos_custom         JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_motivo_perdida_required CHECK (
    (estado = 'perdido' AND motivo_perdida_id IS NOT NULL)
    OR estado <> 'perdido'
  )
);

CREATE INDEX idx_oportunidad_tenant ON public.oportunidad(tenant_id);
CREATE INDEX idx_oportunidad_pipeline_etapa ON public.oportunidad(pipeline_id, etapa_id);
CREATE INDEX idx_oportunidad_asignado ON public.oportunidad(tenant_id, asignado_id);
CREATE INDEX idx_oportunidad_estado ON public.oportunidad(tenant_id, estado);
CREATE INDEX idx_oportunidad_empresa ON public.oportunidad(empresa_id);
CREATE INDEX idx_oportunidad_contacto ON public.oportunidad(contacto_id);
CREATE INDEX idx_oportunidad_custom_gin ON public.oportunidad USING GIN (campos_custom);
CREATE TRIGGER trg_oportunidad_updated_at
  BEFORE UPDATE ON public.oportunidad
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- historial_etapa: tracks every stage change for analytics
-- ------------------------------------------------------------
CREATE TABLE public.historial_etapa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id  UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  etapa_anterior  UUID REFERENCES public.etapa_pipeline(id),
  etapa_nueva     UUID NOT NULL REFERENCES public.etapa_pipeline(id),
  cambiado_por    UUID REFERENCES public.usuario(id),
  cambiado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_historial_oportunidad ON public.historial_etapa(oportunidad_id, cambiado_en DESC);
CREATE INDEX idx_historial_tenant ON public.historial_etapa(tenant_id);

-- ------------------------------------------------------------
-- actividad
-- ------------------------------------------------------------
CREATE TABLE public.actividad (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id    UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('llamada','email','whatsapp','reunion','otra')),
  descripcion       TEXT,
  completada        BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_programada  TIMESTAMPTZ,
  fecha_completada  TIMESTAMPTZ,
  creado_por        UUID REFERENCES public.usuario(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_actividad_tenant ON public.actividad(tenant_id);
CREATE INDEX idx_actividad_oportunidad ON public.actividad(oportunidad_id);
CREATE INDEX idx_actividad_pendientes ON public.actividad(tenant_id, completada, fecha_programada)
  WHERE completada = FALSE;
CREATE TRIGGER trg_actividad_updated_at
  BEFORE UPDATE ON public.actividad
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- nota (polymorphic: empresa | contacto | oportunidad)
-- ------------------------------------------------------------
CREATE TABLE public.nota (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('empresa','contacto','oportunidad')),
  empresa_id      UUID REFERENCES public.empresa(id) ON DELETE CASCADE,
  contacto_id     UUID REFERENCES public.contacto(id) ON DELETE CASCADE,
  oportunidad_id  UUID REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  contenido       TEXT NOT NULL,
  creado_por      UUID REFERENCES public.usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_nota_target CHECK (
    (tipo = 'empresa' AND empresa_id IS NOT NULL AND contacto_id IS NULL AND oportunidad_id IS NULL) OR
    (tipo = 'contacto' AND contacto_id IS NOT NULL AND empresa_id IS NULL AND oportunidad_id IS NULL) OR
    (tipo = 'oportunidad' AND oportunidad_id IS NOT NULL AND empresa_id IS NULL AND contacto_id IS NULL)
  )
);
CREATE INDEX idx_nota_tenant ON public.nota(tenant_id);
CREATE INDEX idx_nota_empresa ON public.nota(empresa_id) WHERE empresa_id IS NOT NULL;
CREATE INDEX idx_nota_contacto ON public.nota(contacto_id) WHERE contacto_id IS NOT NULL;
CREATE INDEX idx_nota_oportunidad ON public.nota(oportunidad_id) WHERE oportunidad_id IS NOT NULL;

-- ------------------------------------------------------------
-- campo_personalizado (definitions of dynamic fields)
-- The VALUES live in the JSONB column `campos_custom` of each entity.
-- ------------------------------------------------------------
CREATE TABLE public.campo_personalizado (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  tipo_entidad  TEXT NOT NULL CHECK (tipo_entidad IN ('empresa','contacto','oportunidad')),
  clave         TEXT NOT NULL
                CHECK (clave ~ '^[a-z][a-z0-9_]{0,49}$'),
  etiqueta      TEXT NOT NULL,
  etiqueta_en   TEXT,
  tipo          TEXT NOT NULL CHECK (tipo IN ('texto','numero','moneda','fecha','seleccion','checkbox','textarea')),
  opciones      JSONB,
  requerido     BOOLEAN NOT NULL DEFAULT FALSE,
  orden         INTEGER NOT NULL DEFAULT 0,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, tipo_entidad, clave)
);
CREATE INDEX idx_campo_personalizado_tenant_entidad
  ON public.campo_personalizado(tenant_id, tipo_entidad, orden);

-- ------------------------------------------------------------
-- backup_log (audit trail for export/import — Sprint 6)
-- ------------------------------------------------------------
CREATE TABLE public.backup_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  accion        TEXT NOT NULL CHECK (accion IN ('export','import')),
  formato       TEXT NOT NULL CHECK (formato IN ('json','csv')),
  registros     JSONB NOT NULL DEFAULT '{}'::jsonb,
  tamano_bytes  BIGINT,
  realizado_por UUID REFERENCES public.usuario(id),
  realizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_backup_log_tenant ON public.backup_log(tenant_id, realizado_en DESC);
