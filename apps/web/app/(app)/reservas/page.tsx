import { cuposConfigurado } from "@/lib/supabase/externo";
import { isPlatformAdmin } from "@/lib/db/planes";
import { listSolicitudesExternas } from "@/lib/db/reservas-externo";
import { resolverMiAgencia, mapReservasPorSolicitud } from "@/lib/db/reservas";
import { PageHeader } from "@/components/ui/page-header";
import { ReservasView } from "./reservas-view";

export default async function ReservasPage() {
  if (!cuposConfigurado()) {
    return (
      <div className="max-w-2xl space-y-4">
        <PageHeader title="Reservas" />
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">⚠️ Falta configurar la conexión con Turistea</p>
          <p>
            Este módulo lee las reservas desde el inventario del sitio web de Turistea. Para que funcione,
            el servidor del CRM necesita dos variables de entorno con la URL y la API key del proyecto
            Supabase del sitio:
          </p>
          <pre className="overflow-x-auto rounded bg-amber-100 p-2 text-xs">
            CUPOS_SUPABASE_URL=https://&lt;proyecto&gt;.supabase.co{"\n"}
            CUPOS_SUPABASE_KEY=&lt;anon o service_role key del sitio&gt;
          </pre>
          <p className="text-xs">
            Agregalas a <code className="rounded bg-amber-100 px-1.5 py-0.5">apps/web/.env.production.local</code> en
            Lightsail, hacé rebuild + restart, y este módulo se reconecta automáticamente.
          </p>
        </div>
      </div>
    );
  }

  const esPlataforma = await isPlatformAdmin();

  // Plataforma (Turistea) → vista mayorista de TODAS las reservas. Agencia → solo las suyas.
  if (esPlataforma) {
    const solicitudes = await listSolicitudesExternas({ limit: 200 });
    return (
      <div className="space-y-4">
        <PageHeader
          title="Reservas (todas las agencias)"
          subtitle="Panel mayorista — solicitudes en vivo desde tu sitio, de todas las agencias."
        />
        <ReservasView solicitudes={solicitudes} negocios={{}} esPlataforma />
      </div>
    );
  }

  const { agencia, nit } = await resolverMiAgencia();
  if (!agencia) {
    return (
      <div className="max-w-2xl space-y-4">
        <PageHeader title="Reservas" />
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          {nit
            ? `No encontramos tu agencia en Turistea con el NIT "${nit}". Verificá el NIT con el administrador.`
            : "Tu agencia todavía no está vinculada a Turistea. Pedile al administrador que configure el NIT de la agencia (Ajustes → Agencias)."}
        </p>
      </div>
    );
  }

  const [solicitudes, negocios] = await Promise.all([
    listSolicitudesExternas({ agenciaId: agencia.agencia_id, limit: 200 }),
    mapReservasPorSolicitud(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reservas Turistea"
        subtitle={`Todas las reservas de tu agencia, sincronizadas en vivo con el sitio (${agencia.agencia_nombre}). Las nuevas se crean desde la oportunidad del cliente.`}
      />
      <ReservasView solicitudes={solicitudes} negocios={negocios} esPlataforma={false} />
    </div>
  );
}
