-- 0041_producto_itinerario.sql
--
-- Itinerario en producto (issue #4 del QA desktop). Espejo del que ya tiene
-- cotizacion (mig 0036), para que cada producto pueda venir con un plan
-- turístico por defecto que después se hereda a la cotización al insertar el
-- producto en una oportunidad.
--
-- Forma del JSON (igual que cotizacion.itinerario):
--   [
--     {
--       "_uid": "p1",                      -- stable React key (cliente)
--       "dia": 1,                          -- número o etiqueta corta
--       "titulo": "Llegada a Cartagena",
--       "descripcion": "Recepción ...",
--       "actividades": ["Tour ...", "Cena ..."]   -- opcional
--     }, ...
--   ]
--
-- Aditiva, default vacío, no rompe nada existente.

ALTER TABLE public.producto
  ADD COLUMN IF NOT EXISTS itinerario JSONB NOT NULL DEFAULT '[]'::jsonb;
