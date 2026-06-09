import { listCatalogoMayorista } from "@/lib/db/catalogo-mayorista";
import { listCatalogoExterno } from "@/lib/db/catalogo-externo";
import { cuposConfigurado } from "@/lib/supabase/externo";
import { getMyPermisos } from "@/lib/db/roles";
import { isPlatformAdmin, getTenantHerramientas } from "@/lib/db/planes";
import { can } from "@/lib/permissions";
import { CatalogoBrowse } from "./catalogo-browse";
import { PageHeader } from "@/components/ui/page-header";

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

  // Solo las agencias copian a su catálogo. Antes el check exigía que el plan
  // tuviera explícitamente el módulo "productos" en `herramientas`, lo cual
  // ocultaba el botón cuando el plan estaba bajo-configurado. Ahora si el rol
  // tiene permiso de crear y el tenant no es plataforma, mostramos el botón —
  // el módulo productos viene activo por default en todos los planes.
  void herramientas;
  const puedeCopiar = !esPlataforma && can(perms.permisos, "productos", "crear", perms.es_admin);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo Turistea"
        subtitle={`Inventario mayorista disponible para vender. ${puedeCopiar ? "Copialo a tus productos con tu markup y usalo en cotizaciones." : "Consultá precios netos y disponibilidad."}`}
      />
      {usaExterno && productos.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">⚠️ No se obtuvieron productos del sitio de Turistea</p>
          <p className="mt-1 text-xs">
            La conexión con la base externa está configurada pero la consulta devolvió 0 productos. Posibles causas:
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            <li>La key <code className="rounded bg-amber-100 px-1 py-0.5">CUPOS_SUPABASE_KEY</code> no tiene permisos de lectura sobre la tabla <code className="rounded bg-amber-100 px-1 py-0.5">bloqueos</code>.</li>
            <li>La URL <code className="rounded bg-amber-100 px-1 py-0.5">CUPOS_SUPABASE_URL</code> apunta a un proyecto sin datos o sin RLS abierto.</li>
            <li>No hay bloqueos en estado <code className="rounded bg-amber-100 px-1 py-0.5">publicado</code> en el sitio.</li>
          </ul>
        </div>
      )}
      {!usaExterno && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p>
            ℹ️ Mostrando el catálogo <strong>local</strong> (productos cargados por Turistea desde Ajustes).
            Para sincronizar con la base de cupos del sitio, configurá las vars
            {" "}<code className="rounded bg-blue-100 px-1 py-0.5">CUPOS_SUPABASE_URL</code>{" "}
            y <code className="rounded bg-blue-100 px-1 py-0.5">CUPOS_SUPABASE_KEY</code> en producción.
          </p>
        </div>
      )}
      <CatalogoBrowse productos={productos} puedeCopiar={puedeCopiar} />
    </div>
  );
}
