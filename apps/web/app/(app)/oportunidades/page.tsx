import { redirect } from "next/navigation";

/**
 * Default view for /oportunidades is the Kanban. The table view lives at
 * /oportunidades/tabla and is reachable from the "Vista tabla" toggle.
 */
export default function OportunidadesPage() {
  redirect("/oportunidades/kanban");
}
