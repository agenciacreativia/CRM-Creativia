import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTenantConfig, RFM_DEFAULT } from "@/lib/db/tenant-config";
import { ConfigComercialForm } from "./form";

export default async function ComercialPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const cfg = await getTenantConfig();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Configuración comercial</h1>
        <p className="text-sm text-gray-500">Umbrales de niveles de viajero y tipo de cambio.</p>
      </div>
      <ConfigComercialForm
        rfmOro={cfg.rfm?.oro ?? RFM_DEFAULT.oro}
        rfmPlata={cfg.rfm?.plata ?? RFM_DEFAULT.plata}
        tcMoneda={cfg.tipo_cambio?.moneda ?? ""}
        tcValor={cfg.tipo_cambio?.valor ?? 0}
      />
    </div>
  );
}
