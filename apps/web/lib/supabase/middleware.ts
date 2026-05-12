import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Refreshes the Supabase session on every request so cookies don't go stale.
 * Returns the user, the response, and (when authenticated) the access_token so
 * the caller can decode its claims (tenant_id, rol).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh/validate the token if needed
  const { data: { user } } = await supabase.auth.getUser();

  // Get the (possibly refreshed) access_token so middleware can read custom claims
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? null;

  return { response, supabase, user, accessToken };
}
