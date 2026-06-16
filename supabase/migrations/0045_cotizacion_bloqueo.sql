-- 0045_cotizacion_bloqueo.sql
-- Extiende `cotizacion` para soportar cotizaciones armadas desde un bloqueo del
-- sitio turistea-web: referencia al plan/salida externos, todos los datos de la
-- reserva + liquidación en un JSONB, y el flujo de confirmación por email
-- (magic-link: el cliente confirma y la cotización pasa a 'confirmada').
--
-- NO consume cupos: la reserva real (crear_solicitud) se dispara después de la
-- confirmación, en una fase posterior.

ALTER TABLE public.cotizacion
  -- Referencias al sitio externo (texto: viven en otro proyecto Supabase).
  ADD COLUMN IF NOT EXISTS bloqueo_id    TEXT,
  ADD COLUMN IF NOT EXISTS fecha_id      TEXT,
  -- Todo el detalle de la reserva + liquidación (acomodaciones, pasajeros,
  -- precios, comisión/impuestos, extras, snapshots de incluye/no_incluye/
  -- condiciones, datos de la agencia). Ver forma en lib/cotizacion/types.ts
  -- (ReservaCotizacion).
  ADD COLUMN IF NOT EXISTS reserva_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Magic-link de confirmación enviado al cliente por email.
  ADD COLUMN IF NOT EXISTS confirm_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmada_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enviada_en    TIMESTAMPTZ;

-- Agregar 'confirmada' a los estados permitidos.
ALTER TABLE public.cotizacion DROP CONSTRAINT IF EXISTS cotizacion_estado_check;
ALTER TABLE public.cotizacion
  ADD CONSTRAINT cotizacion_estado_check
  CHECK (estado IN ('borrador', 'enviada', 'aceptada', 'rechazada', 'confirmada'));

-- Lookup rápido del token al confirmar (único, solo donde existe).
CREATE UNIQUE INDEX IF NOT EXISTS idx_cotizacion_confirm_token
  ON public.cotizacion (confirm_token)
  WHERE confirm_token IS NOT NULL;

COMMENT ON COLUMN public.cotizacion.reserva_data IS
  'JSONB con plan/salida, habitaciones, pasajeros, precios, acomodaciones, liquidación, extras y snapshots — cuando la cotización se arma desde un bloqueo del sitio.';
