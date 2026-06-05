-- ============================================================
-- 0012 — Google account connection (Gmail + Calendar) per user.
--        Tokens are written by the OAuth callback via service_role
--        and read for outbound calls. RLS lets a user see only their
--        own connection status.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cuenta_google (
  usuario_id      UUID PRIMARY KEY REFERENCES public.usuario(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  scope           TEXT,
  expiry          TIMESTAMPTZ NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cuenta_google ENABLE ROW LEVEL SECURITY;

-- A user can read (and delete) only their own connection.
CREATE POLICY cuenta_google_select ON public.cuenta_google
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND usuario_id = auth.uid());

CREATE POLICY cuenta_google_delete ON public.cuenta_google
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND usuario_id = auth.uid());

-- Inserts/updates of tokens are performed by the server via service_role.
