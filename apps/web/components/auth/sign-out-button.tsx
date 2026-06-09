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
    // Validamos el resultado: si la sesion esta corrupta signOut puede rechazar,
    // igualmente forzamos la navegacion a /login para evitar quedar en estado colgado.
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error al cerrar sesion:", error.message);
      }
    } catch (err) {
      console.error("Excepcion al cerrar sesion:", err);
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      {t("nav.sign_out")}
    </Button>
  );
}
