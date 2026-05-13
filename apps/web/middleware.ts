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
  "/landing",
]);

const STATIC_PREFIXES = ["/_next", "/api/health", "/favicon.ico"];

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

  // -- Step 2: Resolve tenant by subdomain
  const tenant = await findTenantBySubdomain(subdomain);
  if (!tenant) {
    return NextResponse.redirect(`${env.ROOT_URL}/landing?reason=invalid_tenant`);
  }

  // -- Step 3: Refresh Supabase session
  const { response, user, accessToken } = await updateSession(request);

  // Forward tenant context to Server Components via request headers
  response.headers.set(TENANT_HEADERS.ID, tenant.id);
  response.headers.set(TENANT_HEADERS.SUBDOMAIN, tenant.subdominio);
  response.headers.set(TENANT_HEADERS.NAME, tenant.nombre_empresa);
  response.headers.set(TENANT_HEADERS.PLAN, tenant.plan);
  request.headers.set(TENANT_HEADERS.ID, tenant.id);
  request.headers.set(TENANT_HEADERS.SUBDOMAIN, tenant.subdominio);
  request.headers.set(TENANT_HEADERS.NAME, tenant.nombre_empresa);
  request.headers.set(TENANT_HEADERS.PLAN, tenant.plan);

  // -- Step 4: Auth gating
  if (isPublic(pathname)) {
    return response;
  }

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
