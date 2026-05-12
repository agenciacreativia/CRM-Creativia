/**
 * Decode a JWT payload without verifying the signature.
 *
 * This is safe to use ONLY after Supabase has validated the token via
 * getUser()/getSession() — we already know the token is authentic.
 *
 * We decode to read custom claims injected by the auth hook (tenant_id, rol,
 * idioma, nombre) which `getUser().app_metadata` does NOT expose.
 */

export type CustomClaims = {
  sub?: string;
  email?: string;
  tenant_id?: string;
  rol?: "admin" | "asesor";
  idioma?: "es" | "en";
  nombre?: string;
  exp?: number;
  iat?: number;
};

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  if (typeof atob !== "undefined") {
    return atob(str);
  }
  return Buffer.from(str, "base64").toString("utf8");
}

export function decodeJwtClaims(token: string | null | undefined): CustomClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload as CustomClaims;
  } catch {
    return null;
  }
}
