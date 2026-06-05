import { notFound } from "next/navigation";
import { getCotizacion } from "@/lib/db/cotizaciones";
import { getOportunidad } from "@/lib/db/oportunidades";
import { getEmpresa } from "@/lib/db/empresas";
import { getContacto } from "@/lib/db/contactos";
import { getTenantFromHeaders } from "@/lib/tenant";
import { cotizacionSubtotal, cotizacionTotal, itemSubtotal, fmtMoney } from "@/lib/cotizacion/types";
import { PrintButton } from "./print-button";

type Params = Promise<{ id: string }>;

export default async function CotizacionPrintPage({ params }: { params: Params }) {
  const { id } = await params;
  const cot = await getCotizacion(id);
  if (!cot) notFound();

  const [opp, tenant] = await Promise.all([getOportunidad(cot.oportunidad_id), getTenantFromHeaders()]);
  const [empresa, contacto] = await Promise.all([
    opp ? getEmpresa(opp.empresa_id) : Promise.resolve(null),
    opp ? getContacto(opp.contacto_id) : Promise.resolve(null),
  ]);

  const subtotal = cotizacionSubtotal(cot.items);
  const total = cotizacionTotal(cot.items, cot.descuento);
  const fecha = new Date(cot.creado_en).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>

        <article className="rounded-lg bg-white p-10 shadow-sm print:rounded-none print:shadow-none">
          {/* Header */}
          <header className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant?.nombre_empresa ?? "Agencia"}</h1>
              <p className="text-sm text-gray-500">Cotización de viaje</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold text-gray-900">{cot.titulo}</p>
              <p>{fecha}</p>
              <p>Válida por {cot.validez_dias} días</p>
            </div>
          </header>

          {/* Client */}
          <section className="grid grid-cols-2 gap-6 py-6 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Para</p>
              {contacto && <p className="font-medium text-gray-900">{contacto.nombre}</p>}
              {empresa && <p className="text-gray-600">{empresa.nombre}</p>}
              {contacto?.email && <p className="text-gray-600">{contacto.email}</p>}
              {contacto?.telefono && <p className="text-gray-600">{contacto.telefono}</p>}
            </div>
            {opp && (
              <div className="text-right">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Referencia</p>
                <p className="text-gray-700">{opp.nombre}</p>
              </div>
            )}
          </section>

          {/* Items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left text-xs uppercase text-gray-500">
                <th className="py-2">Concepto</th>
                <th className="py-2 text-right">Cant.</th>
                <th className="py-2 text-right">Precio</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cot.items.map((it, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5">
                    <p className="font-medium text-gray-900">{it.nombre}</p>
                    {it.descripcion && <p className="text-xs text-gray-500">{it.descripcion}</p>}
                  </td>
                  <td className="py-2.5 text-right text-gray-700">{it.cantidad}</td>
                  <td className="py-2.5 text-right text-gray-700">{fmtMoney(it.precio_unitario, cot.moneda)}</td>
                  <td className="py-2.5 text-right text-gray-900">{fmtMoney(itemSubtotal(it), cot.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{fmtMoney(subtotal, cot.moneda)}</span>
            </div>
            {cot.descuento > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Descuento</span><span>− {fmtMoney(cot.descuento, cot.moneda)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-300 pt-2 text-lg font-bold text-gray-900">
              <span>Total</span><span>{fmtMoney(total, cot.moneda)}</span>
            </div>
          </div>

          {cot.itinerario && cot.itinerario.length > 0 && (
            <section className="mt-8 border-t border-gray-200 pt-6 text-sm">
              <h2 className="mb-3 text-xs font-bold uppercase text-gray-500">Itinerario día por día</h2>
              <ol className="space-y-3">
                {cot.itinerario.map((d) => (
                  <li key={d.dia} className="flex gap-3">
                    <div className="flex shrink-0 flex-col items-center">
                      <span className="rounded-full bg-brand-primary px-2.5 py-0.5 text-xs font-bold text-white">Día {d.dia}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{d.titulo}{d.ciudad ? <span className="font-normal text-gray-500"> · {d.ciudad}</span> : null}</p>
                      {d.descripcion && <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{d.descripcion}</p>}
                      {d.incluye_comidas && d.incluye_comidas.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">Incluye: {d.incluye_comidas.join(" · ")}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {cot.notas && (
            <section className="mt-8 border-t border-gray-200 pt-4 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Notas</p>
              <p className="whitespace-pre-wrap text-gray-700">{cot.notas}</p>
            </section>
          )}

          <footer className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
            {tenant?.nombre_empresa ?? "Agencia de viajes"} · Gracias por tu confianza.
          </footer>
        </article>
      </div>
    </div>
  );
}
