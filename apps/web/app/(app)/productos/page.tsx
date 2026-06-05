import { redirect } from "next/navigation";
import { listProductos } from "@/lib/db/productos";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { ProductosManager } from "./productos-manager";

export default async function ProductosPage() {
  const { permisos, es_admin } = await getMyPermisos();
  if (!can(permisos, "productos", "ver", es_admin)) redirect("/dashboard");

  const productos = await listProductos();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="mt-1 text-xs text-gray-500">
          Catálogo de planes y servicios. Reutilizables en cotizaciones y correos.
        </p>
      </header>

      <ProductosManager
        initial={productos}
        canCrear={can(permisos, "productos", "crear", es_admin)}
        canEditar={can(permisos, "productos", "editar", es_admin)}
        canEliminar={can(permisos, "productos", "eliminar", es_admin)}
      />
    </div>
  );
}
