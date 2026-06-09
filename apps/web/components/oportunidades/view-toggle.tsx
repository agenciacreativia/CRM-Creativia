"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";

const STORAGE_KEY = "crm.oportunidades.lastView";

/** Toggle de vista Tabla/Kanban — persistente en localStorage. */
export function ViewToggle({ active }: { active: "tabla" | "kanban" }) {
  // Guarda la última vista elegida para que el sidebar / link directo a
  // /oportunidades respete la preferencia del usuario al volver.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {
      // sin storage: noop
    }
  }, [active]);

  return (
    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5">
      <Link
        href="/oportunidades/kanban"
        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${active === "kanban" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Kanban
      </Link>
      <Link
        href="/oportunidades/tabla"
        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${active === "tabla" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
      >
        <List className="h-3.5 w-3.5" /> Tabla
      </Link>
    </div>
  );
}

/** Componente cliente que redirige al usuario a su última vista preferida. */
export function PreferredViewRedirector() {
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const target = last === "tabla" ? "/oportunidades/tabla" : "/oportunidades/kanban";
      window.location.replace(target);
    } catch {
      window.location.replace("/oportunidades/kanban");
    }
  }, []);
  return null;
}
