import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listApiKeys } from "@/lib/db/api-keys";
import { listWebhooks } from "@/lib/db/webhooks";
import { listReportesProgramados } from "@/lib/db/reportes-programados";
import { IntegracionesManager } from "./integraciones-manager";

export default async function IntegracionesPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const [apiKeys, webhooks, reportes] = await Promise.all([listApiKeys(), listWebhooks(), listReportesProgramados()]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Integraciones</h1>
        <p className="text-sm text-gray-500">API pública, webhooks salientes, reportes programados y 2FA.</p>
      </div>
      <IntegracionesManager apiKeys={apiKeys} webhooks={webhooks} reportes={reportes} />
    </div>
  );
}
