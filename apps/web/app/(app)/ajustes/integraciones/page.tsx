import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listApiKeys } from "@/lib/db/api-keys";
import { listWebhooks } from "@/lib/db/webhooks";
import { listReportesProgramados } from "@/lib/db/reportes-programados";
import { PageHeader } from "@/components/ui/page-header";
import { IntegracionesManager } from "./integraciones-manager";

export default async function IntegracionesPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const [apiKeys, webhooks, reportes] = await Promise.all([listApiKeys(), listWebhooks(), listReportesProgramados()]);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Integraciones"
        subtitle="API pública, webhooks salientes, reportes programados y 2FA."
        backHref="/ajustes"
        backLabel="Ajustes"
      />
      <IntegracionesManager apiKeys={apiKeys} webhooks={webhooks} reportes={reportes} />
    </div>
  );
}
