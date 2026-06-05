import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";

/** Toggle de vista Tabla/Kanban — siempre presente al lado izquierdo. */
export function ViewToggle({ active }: { active: "tabla" | "kanban" }) {
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
