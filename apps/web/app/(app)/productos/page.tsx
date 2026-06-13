import { redirect } from "next/navigation";
import { listProductos } from "@/lib/db/productos";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { ProductosManager } from "./productos-manager";
import { getEditableFields } from "@/lib/bulk/editable-fields";

export default async function ProductosPage() {
  const { permisos, es_admin } = await getMyPermisos();
  if (!can(permisos, "productos", "ver", es_admin)) redirect("/dashboard");

  const puedeEditar = can(permisos, "productos", "editar", es_admin);
  const productos = await listProductos();
  const editFields = puedeEditar ? await getEditableFields("productos").catch(() => []) : [];

  return (
    <div className="space-y-4">
      <ProductosManager
        initial={productos}
        canCrear={can(permisos, "productos", "crear", es_admin)}
        canEditar={puedeEditar}
        canEliminar={can(permisos, "productos", "eliminar", es_admin)}
        editFields={editFields}
      />
    </div>
  );
}
