import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Supabase OAuth/magic-link callback handler.
 * Not used by password login (which signs in client-side) but kept for future.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // SEGURIDAD: validar `next` como ruta relativa interna. Sin esto, un `next`
  // absoluto (https://evil.com) o protocol-relative (//evil.com) hace que
  // new URL(next, origin) ignore el origin y redirija a un sitio externo
  // (open redirect → phishing post-login).
  const raw = url.searchParams.get("next") ?? "/dashboard";
  const next = /^\/[^/\\]/.test(raw) ? raw : "/dashboard";

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
