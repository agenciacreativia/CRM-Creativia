import { NextRequest, NextResponse } from "next/server";
import { verifyState, exchangeCode, getGoogleEmail } from "@/lib/google/oauth";
import { saveCuentaGoogle } from "@/lib/db/google";
import { env } from "@/lib/env";

/**
 * Google OAuth callback (fixed domain — no tenant session here). Verifies the
 * signed state, exchanges the code for tokens, stores them via service_role,
 * and bounces the user back to their tenant subdomain.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const stateRaw = params.get("state");
  const errorParam = params.get("error");

  const state = verifyState(stateRaw);

  const proto = request.nextUrl.protocol; // "http:" / "https:"
  const back = (status: string) =>
    state?.sub
      ? `${proto}//${state.sub}.${env.BASE_DOMAIN}/ajustes?google=${status}`
      : `${env.ROOT_URL}/ajustes?google=${status}`;

  if (errorParam) return NextResponse.redirect(back("denied"));
  if (!code || !state) return NextResponse.redirect(back("error"));

  try {
    const tokens = await exchangeCode(code);
    const email = (await getGoogleEmail(tokens.access_token)) ?? "(desconocido)";
    await saveCuentaGoogle({
      usuarioId: state.uid,
      tenantId: state.tid,
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      expiresIn: tokens.expires_in,
    });
    return NextResponse.redirect(back("connected"));
  } catch {
    return NextResponse.redirect(back("error"));
  }
}
