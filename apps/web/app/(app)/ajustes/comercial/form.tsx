"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { setConfigComercialAction } from "./actions";

export function ConfigComercialForm({
  rfmOro,
  rfmPlata,
  tcMoneda,
  tcValor,
}: {
  rfmOro: number;
  rfmPlata: number;
  tcMoneda: string;
  tcValor: number;
}) {
  const router = useRouter();
  const [oro, setOro] = useState(String(rfmOro));
  const [plata, setPlata] = useState(String(rfmPlata));
  const [moneda, setMoneda] = useState(tcMoneda);
  const [valor, setValor] = useState(tcValor ? String(tcValor) : "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    setSaving(true);
    const res = await setConfigComercialAction({
      rfm_oro: Number(oro) || 0,
      rfm_plata: Number(plata) || 0,
      tc_moneda: moneda || "",
      tc_valor: valor ? Number(valor) : 0,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    setOk(true);
    setTimeout(() => setOk(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold uppercase text-gray-500">Niveles de viajero (RFM)</h2>
        <p className="mb-3 text-xs text-gray-400">Se calculan solos según el total comprado (oportunidades ganadas) de cada viajero.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Oro · desde (monto)">
            <Input type="number" min="0" value={oro} onChange={(e) => setOro(e.target.value)} />
          </Field>
          <Field label="Plata · desde (monto)">
            <Input type="number" min="0" value={plata} onChange={(e) => setPlata(e.target.value)} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-gray-400">Bronce = por debajo del umbral Plata.</p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold uppercase text-gray-500">Tipo de cambio</h2>
        <p className="mb-3 text-xs text-gray-400">Para mostrar montos convertidos a tu moneda local (1 USD = valor).</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Moneda local (ISO)">
            <Input value={moneda} onChange={(e) => setMoneda(e.target.value)} placeholder="COP" maxLength={8} />
          </Field>
          <Field label="1 USD =">
            <Input type="number" min="0" step="0.0001" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="4000" />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        {ok && <span className="inline-flex items-center gap-1 text-sm text-green-700"><Check className="h-4 w-4" /> Guardado</span>}
      </div>
    </div>
  );
}
