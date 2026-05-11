import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  extractSubdomain,
  findTenantBySubdomain,
  TENANT_HEADERS,
} from "@/lib/tenant";
import { env } from "@/lib/env";

/**
 * Middleware does three things on every request:
 *   1. Resolve subdomain → tenant. Inject tenant headers (or redirect to /landing).
 *   2. Refresh Supabase session cookies.
 *   3. Enforce: authenticated routes need a session; the session's tenant_id MUST
 *      match the subdomain's tenant_id. Cross-tenant access = 403.
 */

const PUBLIC_PATHS = new Set<string>([
  "/login",
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

  // -- Step 1: No subdomain → landing page only
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
    // Unknown / suspended tenant → kick to landing on the root domain
    return NextResponse.redirect(`${env.ROOT_URL}/landing?reason=invalid_tenant`);
  }

  // -- Step 3: Refresh Supabase session
  const { response, user } = await updateSession(request);

  // Forward tenant context to Server Components via request headers
  response.headers.set(TENANT_HEADERS.ID, tenant.id);
  response.headers.set(TENANT_HEADERS.SUBDOMAIN, tenant.subdominio);
  response.headers.set(TENANT_HEADERS.NAME, tenant.nombre_empresa);
  response.headers.set(TENANT_HEADERS.PLAN, tenant.plan);

  // Also patch request headers so getTenantFromHeaders() works in Server Components
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
  // JWT carries tenant_id in app_metadata. Reject if it doesn't match this subdomain.
  const claims = user.app_metadata ?? {};
  const userTenantId = (claims as { tenant_id?: string }).tenant_id;

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
    /*
     * Match all paths except:
     *   _next/static, _next/image, favicon, public assets, /api/health
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
