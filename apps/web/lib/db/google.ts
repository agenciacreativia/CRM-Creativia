import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { refreshAccessToken } from "@/lib/google/oauth";
import { encryptToken, decryptToken } from "@/lib/security/crypto";

export type CuentaGoogle = { email: string; scope: string | null; expiry: string; syncActividades: boolean };

/** Connection status for the current user. Defensive: null if table missing. */
export async function getCuentaGoogle(): Promise<CuentaGoogle | null> {
  const supabase = await createServerSupabase();
  // select("*") tolerates the sync column not existing yet (pre-0014).
  const { data, error } = await supabase.from("cuenta_google").select("*").maybeSingle();
  if (error || !data) return null;
  return {
    email: data.email,
    scope: data.scope ?? null,
    expiry: data.expiry,
    syncActividades: data.sync_actividades ?? true,
  };
}

/** Whether to auto-push CRM activities to Calendar. Defensive: true by default. */
export async function getCalendarSyncEnabled(usuarioId: string): Promise<boolean> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("cuenta_google")
      .select("sync_actividades")
      .eq("usuario_id", usuarioId)
      .maybeSingle();
    return (data?.sync_actividades ?? true) as boolean;
  } catch {
    return true;
  }
}

/** Update the current user's Calendar-sync preference. */
export async function setMyCalendarSync(enabled: boolean): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("cuenta_google")
    .update({ sync_actividades: enabled })
    .eq("usuario_id", user.id);
  if (error) throw new Error(error.message);
}

/** Store tokens (called from the OAuth callback — no user session, uses admin). */
export async function saveCuentaGoogle(args: {
  usuarioId: string;
  tenantId: string;
  email: string;
  accessToken: string;
  refreshToken?: string | null;
  scope?: string | null;
  expiresIn: number;
}): Promise<void> {
  const admin = createAdminSupabase();
  const expiry = new Date(Date.now() + args.expiresIn * 1000).toISOString();
  // Keep the existing refresh_token if Google didn't return a new one.
  // Tokens cifrados en reposo (AES-256-GCM) si TOKEN_ENCRYPTION_KEY está
  // configurada; si no, se guardan en plano (retro-compatible).
  const row: Record<string, unknown> = {
    usuario_id: args.usuarioId,
    tenant_id: args.tenantId,
    email: args.email,
    access_token: encryptToken(args.accessToken),
    scope: args.scope ?? null,
    expiry,
    actualizado_en: new Date().toISOString(),
  };
  if (args.refreshToken) row.refresh_token = encryptToken(args.refreshToken);
  const { error } = await admin.from("cuenta_google").upsert(row, { onConflict: "usuario_id" });
  if (error) throw new Error(error.message);
}

/** Disconnect: removes the current user's connection. */
export async function deleteCuentaGoogle(): Promise<void> {
  const user = await getSessionUser();
  if (!user?.id) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("cuenta_google").delete().eq("usuario_id", user.id);
  if (error) throw new Error(error.message);
}

/**
 * Returns a valid access token for a user, refreshing it if expired.
 * Uses admin (service_role) so it works in background/server contexts.
 * Returns null if the user has no connection.
 */
export async function getValidAccessToken(usuarioId: string): Promise<string | null> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("cuenta_google")
      .select("access_token, refresh_token, expiry")
      .eq("usuario_id", usuarioId)
      .maybeSingle();
    if (!data) return null;

    // Descifrar los tokens almacenados (no-op si están en plano).
    const accessTokenPlano = decryptToken(data.access_token as string | null);
    const refreshTokenPlano = decryptToken(data.refresh_token as string | null);

    // Refresh with a 5-minute safety margin (tokens last ~1h).
    const expiresSoon = new Date(data.expiry).getTime() - Date.now() < 5 * 60_000;
    if (!expiresSoon || !refreshTokenPlano) return accessTokenPlano;

    try {
      const refreshed = await refreshAccessToken(refreshTokenPlano);
      const expiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await admin
        .from("cuenta_google")
        .update({ access_token: encryptToken(refreshed.access_token), expiry, actualizado_en: new Date().toISOString() })
        .eq("usuario_id", usuarioId);
      return refreshed.access_token;
    } catch {
      return accessTokenPlano; // fall back to (maybe stale) token
    }
  } catch {
    return null;
  }
}

/** Current user's valid access token (convenience for server actions). */
export async function getMyAccessToken(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return getValidAccessToken(user.id);
}
