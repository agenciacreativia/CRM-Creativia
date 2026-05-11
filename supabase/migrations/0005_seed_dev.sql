-- ============================================================
-- 0005_seed_dev.sql
-- Seed data for local development.
-- DOES NOT create auth users — run `supabase/seed.ts` for that after migrations.
-- ============================================================

-- 2 demo tenants
INSERT INTO public.tenant (id, nombre_empresa, subdominio, plan, estado, admin_email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp',  'acme',   'professional', 'activo', 'admin@acme.test'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Inc', 'globex', 'starter',      'activo', 'admin@globex.test')
ON CONFLICT (id) DO NOTHING;

-- Default pipelines per tenant
INSERT INTO public.pipeline (id, tenant_id, nombre, descripcion, es_default)
VALUES
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ventas B2B',     'Pipeline principal de ventas', TRUE),
  ('bbbb1111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Pipeline Demo',  'Pipeline default',            TRUE)
ON CONFLICT (id) DO NOTHING;

-- Default stages for each pipeline
INSERT INTO public.etapa_pipeline (tenant_id, pipeline_id, nombre, orden, dias_maximo_alerta)
VALUES
  -- Acme
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Prospección',     0,  7),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Calificación',    1, 10),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Propuesta',       2, 14),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Negociación',     3, 14),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Cierre',          4,  7),
  -- Globex
  ('22222222-2222-2222-2222-222222222222', 'bbbb1111-0000-0000-0000-000000000001', 'Lead',            0,  7),
  ('22222222-2222-2222-2222-222222222222', 'bbbb1111-0000-0000-0000-000000000001', 'Demo Agendada',   1,  5),
  ('22222222-2222-2222-2222-222222222222', 'bbbb1111-0000-0000-0000-000000000001', 'Propuesta',       2, 10),
  ('22222222-2222-2222-2222-222222222222', 'bbbb1111-0000-0000-0000-000000000001', 'Ganada/Perdida',  3,  3)
ON CONFLICT (pipeline_id, nombre) DO NOTHING;

-- Common loss reasons per tenant
INSERT INTO public.motivo_perdida (tenant_id, nombre)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Presupuesto insuficiente'),
  ('11111111-1111-1111-1111-111111111111', 'Eligió un competidor'),
  ('11111111-1111-1111-1111-111111111111', 'Sin necesidad real'),
  ('11111111-1111-1111-1111-111111111111', 'Mal timing'),
  ('22222222-2222-2222-2222-222222222222', 'Presupuesto insuficiente'),
  ('22222222-2222-2222-2222-222222222222', 'Eligió un competidor'),
  ('22222222-2222-2222-2222-222222222222', 'Sin necesidad real')
ON CONFLICT (tenant_id, nombre) DO NOTHING;
