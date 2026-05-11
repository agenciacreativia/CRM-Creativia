import { redirect } from "next/navigation";
import { getTenantFromHeaders } from "@/lib/tenant";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function RootPage() {
  const tenant = await getTenantFromHeaders();

  if (!tenant) {
    redirect("/landing");
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  redirect("/dashboard");
}
