"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle2 } from "lucide-react";
import { disconnectGoogleAction, setCalendarSyncAction } from "./actions";

export function GoogleConnection({
  email,
  syncEnabled = true,
}: {
  email: string | null;
  syncEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState(syncEnabled);

  function disconnect() {
    if (!confirm("¿Desconectar la cuenta de Google?")) return;
    startTransition(async () => {
      const res = await disconnectGoogleAction();
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  function toggleSync() {
    const next = !sync;
    setSync(next);
    startTransition(async () => {
      const res = await setCalendarSyncAction(next);
      if (!res.ok) {
        setError(res.error ?? "Error");
        setSync(!next); // revert
      }
    });
  }

  if (email) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <CheckCircle2 className="h-5 w-5 text-[var(--green-tag)]" />
          Conectado como <span className="font-medium">{email}</span>
        </div>
        <p className="text-xs text-gray-500">
          El CRM puede enviar correos a las oportunidades y crear eventos en tu calendario.
        </p>

        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-sm text-gray-700">
            Cargar actividades del CRM (con fecha) en mi Google Calendar
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={sync}
            onClick={toggleSync}
            disabled={pending}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              sync ? "bg-brand-primary" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                sync ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {error && <p className="text-xs text-status-danger">{error}</p>}
        <button
          type="button"
          onClick={disconnect}
          disabled={pending}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          {pending ? "Desconectando…" : "Desconectar"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Conecta tu cuenta de Google para enviar correos desde el CRM y gestionar tu calendario y tareas.
      </p>
      <a
        href="/api/google/connect"
        className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Mail className="h-4 w-4" />
        Conectar Gmail / Calendar
      </a>
    </div>
  );
}
