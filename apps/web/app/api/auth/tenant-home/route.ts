import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Resolves the subdomain of the tenant that the currently authenticated user
 * belongs to. Used by the central (bare-domain) login to redirect a user to
 * their own tenant workspace after sign-in.
 */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  const { data: usuario } = await admin
    .from("usuario")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario?.tenant_id) {
    return NextResponse.json({ error: "no_usuario" }, { status: 404 });
  }

  const { data: tenant } = await admin
    .from("tenant")
    .select("subdominio")
    .eq("id", usuario.tenant_id)
    .maybeSingle();

  if (!tenant?.subdominio) {
    return NextResponse.json({ error: "no_tenant" }, { status: 404 });
  }

  return NextResponse.json({ subdomain: tenant.subdominio });
}
