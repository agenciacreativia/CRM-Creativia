import { listCatalogoMayorista } from "@/lib/db/catalogo-mayorista";
import { listCatalogoExterno } from "@/lib/db/catalogo-externo";
import { cuposConfigurado } from "@/lib/supabase/externo";
import { getMyPermisos } from "@/lib/db/roles";
import { isPlatformAdmin, getTenantHerramientas } from "@/lib/db/planes";
import { can } from "@/lib/permissions";
import { CatalogoBrowse } from "./catalogo-browse";

export default async function CatalogoPage() {
  // Si está conectada la base de cupos del sitio, leemos en vivo de ahí;
  // si no, caemos al catálogo local (productos manuales).
  const usaExterno = cuposConfigurado();
  const [productos, perms, esPlataforma, herramientas] = await Promise.all([
    usaExterno ? listCatalogoExterno() : listCatalogoMayorista({ soloActivos: true }),
    getMyPermisos(),
    isPlatformAdmin(),
    getTenantHerramientas(),
  ]);

  // Solo las agencias copian a su catálogo (necesitan el módulo productos en su plan + permiso crear).
  const tieneProductos = herramientas === null || herramientas.has("productos");
  const puedeCopiar = !esPlataforma && tieneProductos && can(perms.permisos, "productos", "crear", perms.es_admin);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Catálogo Turistea</h1>
        <p className="mt-1 text-sm text-gray-500">
          Inventario mayorista disponible para vender. {puedeCopiar ? "Copialo a tus productos con tu markup y usalo en cotizaciones." : "Consultá precios netos y disponibilidad."}
        </p>
      </header>
      <CatalogoBrowse productos={productos} puedeCopiar={puedeCopiar} />
    </div>
  );
}
