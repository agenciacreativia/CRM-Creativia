import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  extractSubdomain,
  findTenantBySubdomain,
  TENANT_HEADERS,
} from "@/lib/tenant";
import { decodeJwtClaims } from "@/lib/jwt";
import { env } from "@/lib/env";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/error",
  "/auth/handoff",
  "/invitacion",
  "/landing",
]);

const STATIC_PREFIXES = ["/_next", "/api/health", "/api/auth", "/api/google", "/api/leads", "/api/track", "/api/public", "/api/v1", "/nps", "/favicon.ico"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const subdomain = extractSubdomain(host);

  // -- Step 1: No subdomain → landing
  if (!subdomain) {
    if (pathname === "/landing" || isPublic(pathname)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }

  // -- Step 2: Resolve tenant by subdomain (cached — cheap)
  const tenant = await findTenantBySubdomain(subdomain);
  if (!tenant) {
    // Redirigir al landing del ROOT (sin subdominio). Construimos la URL
    // a partir del request actual para evitar usar env.ROOT_URL — el bundle
    // de Edge a veces inlinea el default "localhost:3000" del build.
    const url = request.nextUrl.clone();
    const baseHost = env.BASE_DOMAIN || url.host;
    url.host = baseHost.split(":")[0];
    url.port = baseHost.includes(":") ? baseHost.split(":")[1] : "";
    url.pathname = "/landing";
    url.search = "?reason=invalid_tenant";
    return NextResponse.redirect(url);
  }

  const setTenantHeaders = (target: { headers: Headers }) => {
    target.headers.set(TENANT_HEADERS.ID, tenant.id);
    target.headers.set(TENANT_HEADERS.SUBDOMAIN, tenant.subdominio);
    target.headers.set(TENANT_HEADERS.NAME, tenant.nombre_empresa);
    target.headers.set(TENANT_HEADERS.PLAN, tenant.plan);
  };

  // -- Step 3: Public paths don't need a user — skip the Supabase session
  // network round-trip entirely. Just forward tenant context and continue.
  if (isPublic(pathname)) {
    setTenantHeaders(request);
    const res = NextResponse.next({ request });
    setTenantHeaders(res);
    return res;
  }

  // -- Step 4: Protected path — refresh Supabase session and gate by auth
  const { response, user, accessToken } = await updateSession(request);
  setTenantHeaders(request);
  setTenantHeaders(response);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // -- Step 5: Cross-tenant guard
  // Custom claims (tenant_id, rol) are injected into the JWT by the auth hook.
  // They live in the JWT payload, NOT in user.app_metadata.
  const claims = decodeJwtClaims(accessToken);
  const userTenantId = claims?.tenant_id;

  if (!userTenantId || userTenantId !== tenant.id) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/error";
    url.searchParams.set("reason", "tenant_mismatch");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
