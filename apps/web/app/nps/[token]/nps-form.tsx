"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { responderNpsAction } from "./actions";

export function NpsForm({ token, contacto }: { token: string; contacto: string | null }) {
  const [puntaje, setPuntaje] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (puntaje == null) return setError("Elegí un puntaje.");
    setSaving(true);
    const res = await responderNpsAction(token, puntaje, comentario);
    setSaving(false);
    if (!res.ok) setError(res.error ?? "Error"); else setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-6 text-center">
        <Check className="mx-auto h-10 w-10 text-green-600" />
        <p className="mt-2 font-semibold text-gray-900">¡Gracias!</p>
        <p className="text-sm text-gray-600">Tu opinión nos ayuda a mejorar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contacto && <p className="text-sm text-gray-600">Hola <b>{contacto}</b>, contanos cómo fue tu viaje:</p>}
      <p className="text-sm font-medium text-gray-800">¿Qué tan probable es que nos recomiendes? <span className="text-xs text-gray-500">(0 = nada, 10 = mucho)</span></p>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }).map((_, i) => {
          const sel = puntaje === i;
          const color = i >= 9 ? "border-green-500 text-green-700 bg-green-50" : i >= 7 ? "border-amber-400 text-amber-700 bg-amber-50" : "border-red-300 text-red-700 bg-red-50";
          return (
            <button
              key={i}
              type="button"
              aria-label={`Puntaje ${i} de 10`}
              onClick={() => setPuntaje(i)}
              className={`rounded-md border py-2 text-sm font-bold transition ${sel ? color + " ring-2 ring-offset-1 ring-brand-primary" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >{i}</button>
          );
        })}
      </div>
      <Textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="¿Querés contarnos algo más? (opcional)" />
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-status-danger">{error}</p>}
      <Button type="button" onClick={enviar} disabled={saving || puntaje == null} className="w-full">
        {saving ? "Enviando…" : "Enviar"}
      </Button>
    </div>
  );
}
