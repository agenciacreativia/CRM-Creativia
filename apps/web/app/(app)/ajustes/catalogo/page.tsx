import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/db/planes";
import { listCatalogoMayorista } from "@/lib/db/catalogo-mayorista";
import { PageHeader } from "@/components/ui/page-header";
import { CatalogoManager } from "./catalogo-manager";

export default async function CatalogoAdminPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");
  const productos = await listCatalogoMayorista();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo mayorista"
        subtitle="Tu inventario de Turistea. Lo que publiques acá lo ven todas las agencias y pueden revenderlo con su markup."
        backHref="/ajustes"
        backLabel="Ajustes"
      />
      <CatalogoManager initial={productos} />
    </div>
  );
}
