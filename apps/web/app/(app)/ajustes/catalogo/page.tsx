import { redirect } from "next/navigation";
import Link from "next/link";
import { isPlatformAdmin } from "@/lib/db/planes";
import { listCatalogoMayorista } from "@/lib/db/catalogo-mayorista";
import { CatalogoManager } from "./catalogo-manager";

export default async function CatalogoAdminPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");
  const productos = await listCatalogoMayorista();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Catálogo mayorista</h1>
        <p className="text-sm text-gray-500">
          Tu inventario de Turistea. Lo que publiques acá lo ven todas las agencias y pueden revenderlo con su markup.
        </p>
      </div>
      <CatalogoManager initial={productos} />
    </div>
  );
}
