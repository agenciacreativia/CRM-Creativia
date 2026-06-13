import { redirect } from "next/navigation";

/**
 * La búsqueda avanzada dejó de ser una página separada: ahora vive en el botón
 * "Filtros avanzados" de cada lista (empresas / contactos / oportunidades), con
 * selector de módulo incorporado. Redirigimos para no romper links guardados.
 */
export default function BuscarRedirect() {
  redirect("/empresas");
}
