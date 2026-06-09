import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getFilterFields } from "@/lib/filters/server";
import { PageHeader } from "@/components/ui/page-header";
import { NuevaListaForm } from "./form";

export default async function NuevaListaPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const fields = await getFilterFields("contacto");
  return (
    <div className="space-y-4">
      <PageHeader
        title="Nueva lista de envío"
        subtitle="Construí la lista filtrando sobre los contactos del CRM (mismos operadores que en Contactos / Empresas / Oportunidades). La lista se guarda con los criterios — al disparar la campaña se vuelve a calcular sobre los contactos actuales."
        backHref="/campanias"
        backLabel="Campañas"
      />
      <NuevaListaForm fields={fields} />
    </div>
  );
}
