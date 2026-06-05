import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { extractSubdomain } from "@/lib/tenant";
import { buildAuthUrl, signState, googleConfigured } from "@/lib/google/oauth";
import { env } from "@/lib/env";

/**
 * Starts the Google OAuth flow. Runs on the tenant subdomain (where we have
 * the session); encodes the user + subdomain into a signed `state` so the
 * fixed-domain callback can finish without a session.
 */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${env.ROOT_URL}/ajustes?google=not_configured`);
  }

  const user = await getSessionUser();
  if (!user?.tenantId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const subdomain = extractSubdomain(request.headers.get("host")) ?? "";
  const state = signState({ sub: subdomain, uid: user.id, tid: user.tenantId, ts: Date.now() });
  return NextResponse.redirect(buildAuthUrl(state));
}
