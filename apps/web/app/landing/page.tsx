import type { Metadata } from "next";
import LandingContent from "@/components/landing/landing-content";

export const metadata: Metadata = {
  title: "Turistea CRM — El CRM hecho para agencias de viajes",
  description:
    "Centraliza clientes, cotizaciones, salidas y comisiones en un solo lugar. Vende más, pierde menos oportunidades y haz crecer tu agencia de viajes con Turistea CRM.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// /landing renderiza la misma landing que / para evitar redirect loops
// durante deploys parciales. La URL canonical via metadata sigue siendo /
// así que SEO no penaliza el contenido duplicado.
export default function LandingPage() {
  return <LandingContent />;
}
