import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantFromHeaders } from "@/lib/tenant";
import { createServerSupabase } from "@/lib/supabase/server";
import LandingContent from "@/components/landing/landing-content";

export const metadata: Metadata = {
  title: "Turistea CRM — El CRM hecho para agencias de viajes",
  description:
    "Centraliza clientes, cotizaciones, salidas y comisiones en un solo lugar. Vende más, pierde menos oportunidades y haz crecer tu agencia de viajes con Turistea CRM.",
};

// Importante: dynamic porque la decisión "landing vs redirect" depende
// del tenant detectado desde headers (subdominio). Sin esto Next.js puede
// pre-renderizar la rama equivocada como SSG.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootPage() {
  const tenant = await getTenantFromHeaders();

  // Sin subdominio de agencia: mostrar la landing pública directamente en /
  if (!tenant) {
    return <LandingContent />;
  }

  // Con subdominio: redirigir a dashboard o login según sesión
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  redirect("/dashboard");
}
