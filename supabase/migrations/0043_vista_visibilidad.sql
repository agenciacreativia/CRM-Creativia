-- 0043_vista_visibilidad.sql
--
-- Visibilidad de filtros guardados (vista_guardada): privada (solo el dueño) o
-- pública (todo el equipo del tenant la ve y puede aplicarla).
--
-- Hasta ahora toda vista era privada (RLS: usuario_id = auth.uid()). Agregamos
-- la columna `visibilidad` y reescribimos la policy de SELECT para que las
-- públicas sean visibles a cualquier usuario del mismo tenant. La escritura
-- (crear/editar/borrar) sigue siendo solo del dueño.

ALTER TABLE public.vista_guardada
  ADD COLUMN IF NOT EXISTS visibilidad TEXT NOT NULL DEFAULT 'privada'
    CHECK (visibilidad IN ('privada', 'publica'));

-- Permitir guardar vistas del módulo productos también.
ALTER TABLE public.vista_guardada DROP CONSTRAINT IF EXISTS vista_guardada_entidad_check;
ALTER TABLE public.vista_guardada
  ADD CONSTRAINT vista_guardada_entidad_check
  CHECK (entidad IN ('oportunidades', 'contactos', 'empresas', 'productos'));

-- SELECT: las propias (cualquier visibilidad) + las públicas del tenant.
DROP POLICY IF EXISTS vista_select ON public.vista_guardada;
CREATE POLICY vista_select ON public.vista_guardada FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (usuario_id = auth.uid() OR visibilidad = 'publica')
  );

-- Write (INSERT/UPDATE/DELETE) sigue restringido al dueño.
-- (la policy vista_write de la mig 0024 ya cubre esto; no se toca)
