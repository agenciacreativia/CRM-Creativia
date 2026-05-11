"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const { t } = useTranslation();

  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      {t("nav.sign_out")}
    </Button>
  );
}
