/**
 * Centralized env access. Fail loudly if a required var is missing.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // public (safe to expose to browser)
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  BASE_DOMAIN: optional("NEXT_PUBLIC_BASE_DOMAIN", "localhost:3000"),
  ROOT_URL: optional("NEXT_PUBLIC_ROOT_URL", "http://localhost:3000"),
  DEFAULT_LOCALE: optional("NEXT_PUBLIC_DEFAULT_LOCALE", "es") as "es" | "en",
};

export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY:
    typeof window === "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined,
  SUPABASE_DB_URL:
    typeof window === "undefined" ? process.env.SUPABASE_DB_URL : undefined,
};
