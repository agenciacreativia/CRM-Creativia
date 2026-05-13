import { notFound } from "next/navigation";
import Link from "next/link";
import { getOportunidad } from "@/lib/db/oportunidades";
import { listActividades } from "@/lib/db/actividades";
import { listNotas } from "@/lib/db/notas";
import { listHistorialOportunidad } from "@/lib/db/historial";
import { getSessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ActividadesSection } from "@/components/oportunidad/actividades-section";
import { NotasSection } from "@/components/notas/notas-section";
import { HistorialSection } from "@/components/oportunidad/historial-section";

type Params = Promise<{ id: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  activo: "info",
  ganado: "success",
  perdido: "danger",
  eliminado: "default",
};

function formatCurrency(value: number | null, moneda: string): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es", { style: "currency", currency: moneda }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });
}

export default async function OportunidadDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [o, user] = await Promise.all([getOportunidad(id), getSessionUser()]);
  if (!o) notFound();
  const canEdit = user?.rol === "admin" || user?.id === o.asignado_id;

  const [actividades, notas, historial] = await Promise.all([
    listActividades(id),
    listNotas({ tipo: "oportunidad", entity_id: id }),
    listHistorialOportunidad(id),
  ]);

  const diasEnEtapa = Math.floor(
    (Date.now() - new Date(o.fecha_entrado_etapa).getTime()) / (1000 * 60 * 60 * 24),
  );
  const limit = o.etapa_dias_maximo_alerta;
  const colorClass =
    o.estado !== "activo"
      ? "text-gray-500"
      : limit && diasEnEtapa >= limit
        ? "text-status-danger"
        : limit && diasEnEtapa >= Math.floor(limit * 0.7)
          ? "text-yellow-600"
          : "text-status-ok";

  return (
    <div className="space-y-6">
      <Link href="/oportunidades" className="text-sm text-brand-primary hover:underline">← Oportunidades</Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{o.nombre}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={ESTADO_BADGE[o.estado] ?? "default"}>{o.estado}</Badge>
            <span className="text-sm text-gray-500">·</span>
            <Link href={`/empresas/${o.empresa_id}`} className="text-sm text-brand-primary hover:underline">{o.empresa_nombre}</Link>
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/oportunidades/${o.id}/editar`}
            className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
        )}
      </header>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Valor" value={formatCurrency(o.valor, o.moneda)} />
          <Stat label="Probabilidad" value={o.probabilidad_cierre != null ? `${o.probabilidad_cierre}%` : "—"} />
          <Stat label="Cierre esperado" value={formatDate(o.fecha_esperada_cierre)} />
          <Stat label="Asignado" value={o.asignado_nombre ?? "no asignado"} />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Pipeline y etapa</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <Field label="Pipeline" value={o.pipeline_nombre} />
          <Field label="Etapa actual" value={o.etapa_nombre} />
          <Field label="Días en etapa" value={<span className={colorClass}>{diasEnEtapa} días</span>} />
        </dl>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Contacto</h2>
        <Link href={`/contactos/${o.contacto_id}`} className="text-brand-primary hover:underline">
          {o.contacto_nombre}
        </Link>
      </section>

      {o.estado === "perdido" && (
        <section className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase text-status-danger mb-3">Motivo de pérdida</h2>
          <p className="text-sm font-medium text-gray-900">{o.motivo_perdida_nombre ?? "—"}</p>
          {o.observaciones_perdida && (
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{o.observaciones_perdida}</p>
          )}
        </section>
      )}

      {o.descripcion && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Descripción</h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{o.descripcion}</p>
        </section>
      )}

      <ActividadesSection oportunidadId={id} initial={actividades} />

      {user && (
        <NotasSection
          initial={notas}
          target={{ tipo: "oportunidad", entity_id: id }}
          currentUserId={user.id}
          currentUserIsAdmin={user.rol === "admin"}
        />
      )}

      <HistorialSection historial={historial} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}
