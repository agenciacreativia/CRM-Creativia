import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTenantConfig, RFM_DEFAULT } from "@/lib/db/tenant-config";
import { PageHeader } from "@/components/ui/page-header";
import { ConfigComercialForm } from "./form";

export default async function ComercialPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const cfg = await getTenantConfig();

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="Configuración comercial"
        subtitle="Umbrales de niveles de viajero y tipo de cambio."
        backHref="/ajustes"
        backLabel="Ajustes"
      />
      <ConfigComercialForm
        rfmOro={cfg.rfm?.oro ?? RFM_DEFAULT.oro}
        rfmPlata={cfg.rfm?.plata ?? RFM_DEFAULT.plata}
        tcMoneda={cfg.tipo_cambio?.moneda ?? ""}
        tcValor={cfg.tipo_cambio?.valor ?? 0}
      />
    </div>
  );
}
