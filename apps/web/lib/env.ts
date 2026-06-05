/**
 * Centralized env access.
 *
 * IMPORTANT: NEXT_PUBLIC_* vars must be referenced via literal property access
 * (e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`), not dynamic indexing
 * (`process.env[name]`). Webpack only inlines literal references at build time;
 * dynamic ones survive to the browser where `process.env` is empty.
 */

function missing(name: string): never {
  throw new Error(`Missing required env var: ${name}`);
}

// Public — safe to expose to browser. Statically referenced so webpack inlines.
export const env = {
  SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || missing("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || missing("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "localhost:3000",
  ROOT_URL: process.env.NEXT_PUBLIC_ROOT_URL ?? "http://localhost:3000",
  DEFAULT_LOCALE: (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "es") as "es" | "en",
};

// Server-only — never inlined. Use `import "server-only"` in callers when needed.
export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY:
    typeof window === "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined,
  SUPABASE_DB_URL:
    typeof window === "undefined" ? process.env.SUPABASE_DB_URL : undefined,
  SUPABASE_JWT_SECRET:
    typeof window === "undefined" ? process.env.SUPABASE_JWT_SECRET : undefined,
  GOOGLE_CLIENT_ID:
    typeof window === "undefined" ? process.env.GOOGLE_CLIENT_ID : undefined,
  GOOGLE_CLIENT_SECRET:
    typeof window === "undefined" ? process.env.GOOGLE_CLIENT_SECRET : undefined,
  GOOGLE_REDIRECT_URI:
    typeof window === "undefined" ? process.env.GOOGLE_REDIRECT_URI : undefined,
  // External Supabase project that holds the website's cupos/planes inventory.
  CUPOS_SUPABASE_URL:
    typeof window === "undefined" ? process.env.CUPOS_SUPABASE_URL : undefined,
  CUPOS_SUPABASE_KEY:
    typeof window === "undefined" ? process.env.CUPOS_SUPABASE_KEY : undefined,
  // Stripe (billing) — connected post-launch.
  STRIPE_SECRET_KEY:
    typeof window === "undefined" ? process.env.STRIPE_SECRET_KEY : undefined,
  STRIPE_WEBHOOK_SECRET:
    typeof window === "undefined" ? process.env.STRIPE_WEBHOOK_SECRET : undefined,
};

/** Whether Stripe billing is configured (keys present). */
export const stripeConfigurado = (): boolean =>
  typeof window === "undefined" && !!process.env.STRIPE_SECRET_KEY;
