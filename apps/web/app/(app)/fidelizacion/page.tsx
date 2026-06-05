import Link from "next/link";
import { Cake, FileWarning } from "lucide-react";
import { getFidelizacion } from "@/lib/db/fidelizacion";
import { Badge } from "@/components/ui/badge";

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short" });
}

export default async function FidelizacionPage() {
  const { cumpleanos, vencimientos } = await getFidelizacion();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Fidelización</h1>
        <p className="text-sm text-gray-500">Cumpleaños próximos y documentos por vencer — oportunidades para contactar al viajero.</p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <Cake className="h-4 w-4 text-pink-500" />
          <h2 className="text-sm font-bold uppercase text-gray-500">Cumpleaños (próximos 30 días)</h2>
          <span className="text-xs text-gray-400">{cumpleanos.length}</span>
        </div>
        {cumpleanos.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-gray-500">Sin cumpleaños próximos. Cargá la fecha de nacimiento en los contactos.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cumpleanos.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <Link href={`/contactos/${c.id}`} className="text-sm font-medium text-brand-primary hover:underline">{c.nombre}</Link>
                  <p className="text-xs text-gray-500">{fmt(c.fecha)} · cumple {c.cumple} {c.email ? `· ${c.email}` : ""}</p>
                </div>
                <Badge variant={c.dias === 0 ? "success" : c.dias <= 7 ? "warn" : "default"}>
                  {c.dias === 0 ? "¡Hoy!" : `en ${c.dias} días`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <FileWarning className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase text-gray-500">Documentos por vencer (90 días)</h2>
          <span className="text-xs text-gray-400">{vencimientos.length}</span>
        </div>
        {vencimientos.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-gray-500">Sin documentos por vencer. Cargá la fecha de vencimiento en los pasajeros.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {vencimientos.map((v) => (
              <li key={v.pasajero_id} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{v.nombre}</p>
                  <p className="text-xs text-gray-500">
                    vence {fmt(v.doc_vencimiento)}
                    {v.oportunidad_id && <> · <Link href={`/oportunidades/${v.oportunidad_id}`} className="text-brand-primary hover:underline">{v.oportunidad_nombre ?? "oportunidad"}</Link></>}
                  </p>
                </div>
                <Badge variant={v.dias < 0 ? "danger" : v.dias <= 30 ? "warn" : "default"}>
                  {v.dias < 0 ? "vencido" : `en ${v.dias} días`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
