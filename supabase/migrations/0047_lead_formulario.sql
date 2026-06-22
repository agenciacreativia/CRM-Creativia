-- 0047 — Slug del formulario que originó la oportunidad.
--
-- Para que el sitio web pueda decir "este lead vino del form de Solicitud de
-- bloqueo", "Cotización", "Newsletter", etc. — independiente de a qué pipeline
-- vaya. Útil para analytics granular sin tener que mirar nombres de pipeline.
--
-- El pipeline destino ya se resuelve por nombre desde el payload (campo
-- `pipeline`). El campo `formulario` solo identifica al form de origen.

alter table public.oportunidad
    add column if not exists formulario text;

create index if not exists oportunidad_formulario_idx
    on public.oportunidad (formulario);
