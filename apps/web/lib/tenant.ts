import "server-only";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type Tenant = {
  id: string;
  nombre_empresa: string;
  subdominio: string;
  plan: "starter" | "professional" | "enterprise";
  estado: "activo" | "suspendido" | "cancelado";
};

const TENANT_HEADER = "x-tenant-id";
const SUBDOMAIN_HEADER = "x-tenant-subdomain";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "static",
  "assets",
  "cdn",
  "mail",
  "blog",
]);

/**
 * Extract the tenant subdomain from a Host header.
 * Returns null for: bare domain, IP addresses, reserved subdomains.
 */
export function extractSubdomain(host: string | null): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();
  const baseDomain = env.BASE_DOMAIN.split(":")[0].toLowerCase();

  // IP address? skip
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;

  // bare domain (crmturistea.com) → no tenant
  if (hostname === baseDomain) return null;

  // does it end with .baseDomain ?
  if (!hostname.endsWith(`.${baseDomain}`)) return null;

  const subdomain = hostname.slice(0, hostname.length - baseDomain.length - 1);

  if (!subdomain) return null;
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null;
  if (subdomain.includes(".")) {
    // multi-level subdomain like "x.acme" — take the leftmost
    return subdomain.split(".")[0];
  }
  return subdomain;
}

/**
 * Look up a tenant by its subdomain using the admin (service_role) client.
 * This bypasses RLS — required because we don't have an authenticated user yet.
 */
export async function findTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("tenant")
    .select("id, nombre_empresa, subdominio, plan, estado")
    .eq("subdominio", subdomain)
    .eq("estado", "activo")
    .maybeSingle();

  if (error) {
    console.error("findTenantBySubdomain error:", error);
    return null;
  }
  return data as Tenant | null;
}

/**
 * Read tenant context from request headers (set by middleware).
 * Use this in Server Components/Actions instead of re-querying.
 */
export async function getTenantFromHeaders(): Promise<Tenant | null> {
  const h = await headers();
  const id = h.get(TENANT_HEADER);
  const subdomain = h.get(SUBDOMAIN_HEADER);
  if (!id || !subdomain) return null;

  // Minimal tenant object — full lookup only if a page actually needs it
  // For now, we expose what middleware passed.
  return {
    id,
    nombre_empresa: h.get("x-tenant-name") ?? "",
    subdominio: subdomain,
    plan: (h.get("x-tenant-plan") ?? "starter") as Tenant["plan"],
    estado: "activo",
  };
}

export const TENANT_HEADERS = {
  ID: TENANT_HEADER,
  SUBDOMAIN: SUBDOMAIN_HEADER,
  NAME: "x-tenant-name",
  PLAN: "x-tenant-plan",
};
