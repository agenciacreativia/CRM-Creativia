import { PreferredViewRedirector } from "@/components/oportunidades/view-toggle";

/**
 * Entrypoint de Oportunidades. Renderiza un componente cliente minimal que lee
 * `localStorage["crm.oportunidades.lastView"]` y hace replace() a /tabla o
 * /kanban según la última vista usada. Fallback: kanban.
 */
export default function OportunidadesIndexPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-gray-500">Cargando tu última vista de oportunidades…</p>
      <PreferredViewRedirector />
    </div>
  );
}
