import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle } from "lucide-react";

type Params = Promise<{ id: string }>;

type CampaniaDetail = {
  id: string;
  nombre: string;
  asunto: string;
  estado: "borrador" | "enviada" | "cancelada";
  enviados: number;
  errores?: number;
  destinatarios_total?: number;
  error_resumen?: string | null;
  creada_en: string;
  enviada_en: string | null;
};

type CorreoRow = {
  id: string;
  destinatario: string;
  contacto_id: string | null;
  enviado_en: string;
  abierto_en: string | null;
  click_en: string | null;
  aperturas: number;
  clicks: number;
  contacto: { nombre: string | null } | { nombre: string | null }[] | null;
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

export default async function CampaniaDetailPage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/campanias");

  const { id } = await params;
  const supabase = await createServerSupabase();

  // 1) Cabecera. Defensa: si la mig 0040 no corrió, las columnas extra no existen.
  let camp: CampaniaDetail | null = null;
  const full = await supabase
    .from("campania")
    .select("id, nombre, asunto, estado, enviados, errores, destinatarios_total, error_resumen, creada_en, enviada_en")
    .eq("id", id)
    .maybeSingle();
  if (full.error && /column.*(errores|destinatarios_total|error_resumen)/i.test(full.error.message)) {
    const legacy = await supabase
      .from("campania")
      .select("id, nombre, asunto, estado, enviados, creada_en, enviada_en")
      .eq("id", id)
      .maybeSingle();
    camp = (legacy.data as CampaniaDetail) ?? null;
  } else {
    camp = (full.data as CampaniaDetail) ?? null;
  }
  if (!camp) notFound();

  // 2) Filas de correo_enviado para esta campaña (join contacto.nombre).
  const { data: correos } = await supabase
    .from("correo_enviado")
    .select("id, destinatario, contacto_id, enviado_en, abierto_en, click_en, aperturas, clicks, contacto:contacto_id(nombre)")
    .eq("campania_id", id)
    .order("enviado_en", { ascending: false });
  const rows = ((correos ?? []) as CorreoRow[]).map((r) => {
    const c = Array.isArray(r.contacto) ? r.contacto[0] : r.contacto;
    return { ...r, contacto_nombre: c?.nombre ?? null };
  });

  // 3) Agregados para la cabecera.
  const totalEnviados = rows.length;
  const totalAbiertos = rows.filter((r) => r.abierto_en != null).length;
  const totalClicks = rows.filter((r) => r.click_en != null).length;
  const tasaApertura = totalEnviados ? Math.round((totalAbiertos / totalEnviados) * 1000) / 10 : 0;
  const tasaClick = totalEnviados ? Math.round((totalClicks / totalEnviados) * 1000) / 10 : 0;

  return (
    <div className="space-y-4">
      <Link href="/campanias" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Campañas
      </Link>

      <PageHeader
        title={camp.nombre}
        subtitle={camp.asunto}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={camp.estado === "enviada" ? "success" : camp.estado === "cancelada" ? "default" : "info"}>
          {camp.estado}
        </Badge>
        <span className="text-xs text-gray-500">Creada {fmtDate(camp.creada_en)}</span>
        {camp.enviada_en && <span className="text-xs text-gray-500">· Enviada {fmtDate(camp.enviada_en)}</span>}
      </div>

      {camp.error_resumen && (
        <p role="alert" className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Último error: {camp.error_resumen}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Audiencia" value={String(camp.destinatarios_total ?? "—")} />
        <Kpi label="Enviados ok" value={String(totalEnviados)} />
        <Kpi label="Con error" value={String(camp.errores ?? "—")} danger={(camp.errores ?? 0) > 0} />
        <Kpi label="Tasa apertura" value={`${tasaApertura}% (${totalAbiertos})`} />
        <Kpi label="Tasa click" value={`${tasaClick}% (${totalClicks})`} />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase text-gray-500">Destinatarios</h2>
          <p className="text-xs text-gray-500">Detalle por contacto: cuándo se mandó, si se abrió y si hicieron click.</p>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">Sin registros de envío. (Si la campaña todavía no se mandó, la tabla queda vacía.)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Contacto</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Enviado</th>
                  <th className="px-4 py-2 font-medium">Abierto</th>
                  <th className="px-4 py-2 font-medium">Click</th>
                  <th className="px-4 py-2 font-medium text-right">Aperturas</th>
                  <th className="px-4 py-2 font-medium text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 ? "bg-blue-50/30" : ""}`}>
                    <td className="px-4 py-2">
                      {r.contacto_id ? (
                        <Link href={`/contactos/${r.contacto_id}`} className="text-brand-primary hover:underline">
                          {r.contacto_nombre ?? r.destinatario}
                        </Link>
                      ) : (
                        <span className="text-gray-700">{r.contacto_nombre ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.destinatario}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtDate(r.enviado_en)}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {r.abierto_en ? <span title={fmtDate(r.abierto_en)} className="text-green-700">✓ {fmtDate(r.abierto_en)}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {r.click_en ? <span title={fmtDate(r.click_en)} className="text-green-700">✓ {fmtDate(r.click_en)}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">{r.aperturas}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{r.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Nota: SPAM y bounces no se reportan al CRM cuando se envía vía Gmail OAuth. Para tener esa señal hay que migrar el envío a un provider transaccional (SES / SendGrid / Mailgun) con webhook de eventos.
      </p>
    </div>
  );
}

function Kpi({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${danger ? "text-status-danger" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
