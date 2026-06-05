"use client";

import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

/** Shown when the platform admin is viewing the CRM as an agency (support mode). */
export function ImpersonationBanner() {
  const [info, setInfo] = useState<{ agencia: string; volver: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("crm.impersonando");
      if (raw) setInfo(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  if (!info) return null;

  async function salir() {
    try {
      await createBrowserSupabase().auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem("crm.impersonando");
    } catch {
      /* ignore */
    }
    window.location.href = info?.volver || "/";
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-300 bg-purple-50 px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm text-purple-900">
        <Eye className="h-4 w-4 shrink-0" />
        Modo soporte — estás viendo el CRM como <b>{info.agencia}</b>.
      </p>
      <button
        onClick={salir}
        className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-white px-3 py-1 text-sm font-medium text-purple-800 hover:bg-purple-100"
      >
        <LogOut className="h-3.5 w-3.5" /> Salir
      </button>
    </div>
  );
}
