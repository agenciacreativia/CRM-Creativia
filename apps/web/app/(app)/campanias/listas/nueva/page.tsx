import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getFilterFields } from "@/lib/filters/server";
import { NuevaListaForm } from "./form";

export default async function NuevaListaPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const fields = await getFilterFields("contacto");
  return (
    <div className="space-y-4">
      <Link href="/campanias" className="text-sm text-brand-navy hover:underline">← Campañas</Link>
      <header>
        <h1 className="text-2xl font-bold">Nueva lista de envío</h1>
        <p className="text-sm text-gray-500">
          Construí la lista filtrando sobre los contactos del CRM (mismos operadores que en Contactos / Empresas / Oportunidades).
          La lista se guarda con los criterios — al disparar la campaña se vuelve a calcular sobre los contactos actuales.
        </p>
      </header>
      <NuevaListaForm fields={fields} />
    </div>
  );
}
