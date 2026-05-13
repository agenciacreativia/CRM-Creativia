-- ============================================================
-- 0006_replace_demos_with_creativia.sql
-- Sprint 2 foundation:
--   1. Add `direccion` column to empresa
--   2. Replace demo tenants (Acme, Globex) with the real tenant Creativia
--   3. Seed Creativia's default pipelines/stages from Juan's actual data
-- ============================================================

-- ---------- 1. Schema change: empresa.direccion ----------
ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS direccion TEXT;

-- ---------- 2. Drop demo data (Acme, Globex) ----------
-- tenant cascade deletes: usuario, empresa, contacto, oportunidad, pipeline,
-- etapa_pipeline, actividad, nota, motivo_perdida, campo_personalizado, etc.
DELETE FROM public.tenant
 WHERE id IN (
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222'
 );

-- Drop the corresponding auth.users (cascade from tenant only removes
-- public.usuario, not auth.users — these are FK'd the other direction).
DELETE FROM auth.users
 WHERE email IN (
   'admin@acme.test',
   'asesor@acme.test',
   'admin@globex.test',
   'asesor@globex.test'
 );

-- ---------- 3. Create Creativia tenant ----------
INSERT INTO public.tenant (id, nombre_empresa, subdominio, plan, estado, admin_email)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Creativia',
  'creativia',
  'professional',
  'activo',
  'juancarlos@agenciacreativia.com'
)
ON CONFLICT (id) DO UPDATE
  SET nombre_empresa = EXCLUDED.nombre_empresa,
      subdominio     = EXCLUDED.subdominio,
      plan           = EXCLUDED.plan,
      estado         = EXCLUDED.estado,
      admin_email    = EXCLUDED.admin_email;

-- ---------- 4. Default pipelines (from Juan's actual data) ----------
INSERT INTO public.pipeline (id, tenant_id, nombre, descripcion, es_default)
VALUES
  ('cc111111-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333',
   'Ventas',
   'Pipeline principal de ventas',
   TRUE),
  ('cc111111-0000-0000-0000-000000000002',
   '33333333-3333-3333-3333-333333333333',
   'Prospección',
   'Pipeline para leads en etapa inicial',
   FALSE)
ON CONFLICT (id) DO NOTHING;

-- ---------- 5. Default stages per pipeline ----------
-- Pipeline Ventas: stages found in user's data + reasonable extras
INSERT INTO public.etapa_pipeline (tenant_id, pipeline_id, nombre, orden, dias_maximo_alerta)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000001', 'Interesado',  0,  7),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000001', 'Contactado',  1,  7),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000001', 'Cotizado',    2, 14),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000001', 'Negociación', 3, 14),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000001', 'Cierre',      4,  7),
  -- Pipeline Prospección
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000002', 'Lead frío',   0, 14),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000002', 'Calificado',  1,  7),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000002', 'Cotizado',    2, 14),
  ('33333333-3333-3333-3333-333333333333', 'cc111111-0000-0000-0000-000000000002', 'Convertido',  3,  3)
ON CONFLICT (pipeline_id, nombre) DO NOTHING;

-- ---------- 6. Common loss reasons ----------
INSERT INTO public.motivo_perdida (tenant_id, nombre)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Presupuesto insuficiente'),
  ('33333333-3333-3333-3333-333333333333', 'Eligió un competidor'),
  ('33333333-3333-3333-3333-333333333333', 'Sin necesidad real'),
  ('33333333-3333-3333-3333-333333333333', 'Mal timing'),
  ('33333333-3333-3333-3333-333333333333', 'No respondió'),
  ('33333333-3333-3333-3333-333333333333', 'Sin motivo registrado')
ON CONFLICT (tenant_id, nombre) DO NOTHING;
