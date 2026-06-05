"use client";

import { useState } from "react";
import { Smile, Copy, Check } from "lucide-react";
import { enviarNpsAction } from "./nps-actions";

export function EnviarNpsButton({ oportunidadId, contactoId }: { oportunidadId: string; contactoId: string | null }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setBusy(true); setError(null);
    const res = await enviarNpsAction(oportunidadId, contactoId);
    setBusy(false);
    if (!res.ok || !res.url) setError(res.error ?? "Error"); else setUrl(res.url);
  }
  function copy() {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }

  return (
    <div>
      <button
        type="button"
        onClick={generar}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <Smile className="h-4 w-4" /> {busy ? "Generando…" : "Enviar NPS"}
      </button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
      {url && (
        <div className="mt-2 flex items-center gap-2 rounded border border-green-200 bg-green-50 px-2 py-1.5 text-xs">
          <code className="flex-1 truncate text-gray-700">{url}</code>
          <button onClick={copy} className="inline-flex items-center gap-1 text-brand-primary hover:underline">
            {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
          </button>
        </div>
      )}
    </div>
  );
}
