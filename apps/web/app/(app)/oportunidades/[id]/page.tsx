import { notFound } from "next/navigation";
import Link from "next/link";
import { getOportunidad, listEtapasDePipeline } from "@/lib/db/oportunidades";
import { getContacto } from "@/lib/db/contactos";
import { getEmpresa } from "@/lib/db/empresas";
import { listActividades } from "@/lib/db/actividades";
import { listNotas } from "@/lib/db/notas";
import { listHistorialOportunidad, listHistorialCambios } from "@/lib/db/historial";
import { listCampos } from "@/lib/db/campos";
import { listDocumentos } from "@/lib/db/documentos";
import { getCuentaGoogle } from "@/lib/db/google";
import { listPlantillas } from "@/lib/db/plantillas";
import { listProductos } from "@/lib/db/productos";
import { listOportunidadProductos } from "@/lib/db/oportunidad-productos";
import { listCotizaciones } from "@/lib/db/cotizaciones";
import { getMyPermisos } from "@/lib/db/roles";
import { getTenantHerramientas, isPlatformAdmin } from "@/lib/db/planes";
import { listEtiquetas, listEtiquetasDe } from "@/lib/db/etiquetas";
import { listSecuencias } from "@/lib/db/secuencias";
import { listReservasDeOportunidad } from "@/lib/db/reservas";
import { listCatalogoExterno } from "@/lib/db/catalogo-externo";
import { listPasajeros } from "@/lib/db/pasajeros";
import { listHabitaciones } from "@/lib/db/habitaciones";
import { cuposConfigurado } from "@/lib/supabase/externo";
import { TagPicker } from "@/components/etiquetas/tag-picker";
import { EnrollButton } from "@/components/secuencias/enroll-button";
import { ReservaPanel } from "./reserva-panel";
import { PasajerosSection } from "./pasajeros-section";
import { HabitacionesSection } from "./habitaciones-section";
import { EnviarNpsButton } from "./nps-button";
import { listCorreosEnviadosOportunidad } from "@/lib/db/correo-tracking";
import { CorreosTracking } from "./correos-tracking";
import { can } from "@/lib/permissions";
import { listUsuarios } from "@/lib/db/usuarios";
import { buildMergeVars } from "@/lib/email/merge";
import { getSessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { HistorialSection } from "@/components/oportunidad/historial-section";
import { StageWizard } from "./stage-wizard";
import { DetailAside } from "./detail-aside";
import { ActivityTabs } from "./activity-tabs";

type Params = Promise<{ id: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  activo: "info",
  ganado: "success",
  perdido: "danger",
  eliminado: "default",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });
}

export default async function OportunidadDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [o, user, perms] = await Promise.all([getOportunidad(id), getSessionUser(), getMyPermisos()]);
  if (!o) notFound();
  const isOwnerOrAdmin = user?.rol === "admin" || user?.id === o.asignado_id;
  const canEdit = isOwnerOrAdmin && can(perms.permisos, "oportunidades", "editar", perms.es_admin);

  const [contacto, empresa, etapas, actividades, notas, documentos, historial, cambios, campos, usuarios] =
    await Promise.all([
      getContacto(o.contacto_id),
      getEmpresa(o.empresa_id),
      listEtapasDePipeline(o.pipeline_id),
      listActividades(id),
      listNotas({ tipo: "oportunidad", entity_id: id }),
      listDocumentos("oportunidad", id),
      listHistorialOportunidad(id),
      listHistorialCambios("oportunidad", id),
      listCampos("oportunidad"),
      listUsuarios(),
    ]);

  const [cuentaGoogle, plantillas, productos, oportunidadProductos, cotizaciones, herramientas] = await Promise.all([
    getCuentaGoogle(),
    listPlantillas(),
    listProductos({ soloActivos: true }),
    listOportunidadProductos(id),
    listCotizaciones(id),
    getTenantHerramientas(),
  ]);
  const [todasEtiquetas, etiquetasOpp, secuencias, correosTracking] = await Promise.all([
    listEtiquetas(),
    listEtiquetasDe("oportunidad", id),
    listSecuencias(true),
    listCorreosEnviadosOportunidad(id),
  ]);

  // Reservas B2B contra Turistea (solo si la integración está configurada y no es la plataforma).
  const usaReservas = cuposConfigurado();
  const [reservas, planesCatalogo, esPlataforma, pasajeros, habitaciones] = await Promise.all([
    usaReservas ? listReservasDeOportunidad(id) : Promise.resolve([]),
    usaReservas ? listCatalogoExterno() : Promise.resolve([]),
    isPlatformAdmin(),
    usaReservas ? listPasajeros(id) : Promise.resolve([]),
    usaReservas ? listHabitaciones(id) : Promise.resolve([]),
  ]);
  const puedeReservar = usaReservas && !esPlataforma;
  const merge = buildMergeVars({ opp: o, contacto, empresa, campos });

  // Plan ceiling for the activity tabs (null = no ceiling → all enabled).
  const tiene = (k: string) => herramientas === null || herramientas.has(k);
  const planTools = {
    correo: tiene("google_integracion"),
    reunionGoogle: tiene("google_integracion") || tiene("meet"),
    productos: tiene("productos_oportunidad"),
    cotizacion: tiene("cotizaciones"),
    documentos: tiene("documentos"),
  };

  const historialEntries = [
    ...historial.map((h) => ({
      id: `etapa-${h.id}`,
      texto: h.etapa_anterior_nombre
        ? `De ${h.etapa_anterior_nombre} a ${h.etapa_nueva_nombre}`
        : `Entró en ${h.etapa_nueva_nombre}`,
      autor: h.cambiado_por_nombre,
      fecha: h.cambiado_en,
    })),
    ...cambios.map((c) => ({ id: `cambio-${c.id}`, texto: c.descripcion, autor: c.autor, fecha: c.fecha })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const diasEnEtapa = Math.floor(
    (Date.now() - new Date(o.fecha_entrado_etapa).getTime()) / (1000 * 60 * 60 * 24),
  );
  const limit = o.etapa_dias_maximo_alerta;
  const diasColor =
    o.estado !== "activo"
      ? "text-gray-500"
      : limit && diasEnEtapa >= limit
        ? "text-status-danger"
        : limit && diasEnEtapa >= Math.floor(limit * 0.7)
          ? "text-yellow-600"
          : "text-status-ok";

  return (
    <div className="space-y-4">
      <Link href="/oportunidades" className="text-sm text-brand-primary hover:underline">
        ← Oportunidades
      </Link>

      {/* Top container: title + embudo. Mobile: apilamos. */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{o.nombre}</h1>
            <Badge variant={ESTADO_BADGE[o.estado] ?? "default"}>{o.estado}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Embudo: <span className="font-medium text-gray-700">{o.pipeline_nombre}</span>
          </p>
          <div className="mt-2">
            <TagPicker
              entidad="oportunidad"
              entityId={id}
              all={todasEtiquetas}
              asignadas={etiquetasOpp}
              canEdit={canEdit}
              revalidate={`/oportunidades/${id}`}
            />
          </div>
        </div>
        {canEdit && o.estado !== "eliminado" && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <EnrollButton oportunidadId={id} secuencias={secuencias.map((s) => ({ id: s.id, nombre: s.nombre, pasos: s.pasos.length }))} />
            {o.estado === "ganado" && <EnviarNpsButton oportunidadId={id} contactoId={o.contacto_id} />}
            <Link
              href={`/oportunidades/${o.id}/editar`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              Editar
            </Link>
          </div>
        )}
      </div>

      {o.estado === "eliminado" && (() => {
        const eliminada = o.eliminada_en ? new Date(o.eliminada_en) : null;
        const purgaIso = eliminada ? new Date(eliminada.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
        const dias = purgaIso ? Math.max(0, Math.ceil((purgaIso.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;
        return (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Oportunidad eliminada.</strong> Permanece en estado <em>eliminada</em> y no se puede editar. Se purga automáticamente en {dias ?? "—"} días{purgaIso ? ` (${purgaIso.toISOString().slice(0, 10)})` : ""}. No descuenta del límite de tu plan.
          </div>
        );
      })()}

      {/* Stage wizard */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <StageWizard
          oportunidadId={id}
          etapas={etapas.map((e) => ({ id: e.id, nombre: e.nombre }))}
          currentEtapaId={o.etapa_id}
          canEdit={canEdit}
        />
        <p className="mt-3 text-xs text-gray-500">
          Etapa actual: <span className="font-medium text-gray-700">{o.etapa_nombre}</span> ·{" "}
          <span className={diasColor}>{diasEnEtapa} días en etapa</span>
        </p>
      </div>

      {o.estado === "perdido" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <span className="font-semibold text-status-danger">Perdida:</span>{" "}
          {o.motivo_perdida_nombre ?? "—"}
          {o.observaciones_perdida && (
            <span className="block text-gray-700">{o.observaciones_perdida}</span>
          )}
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Big section */}
        <div className="space-y-4 lg:col-span-2">
          <ActivityTabs
            oportunidadId={id}
            actividades={actividades}
            notas={notas}
            documentos={documentos}
            currentUserId={user?.id ?? ""}
            currentUserIsAdmin={user?.rol === "admin"}
            canEdit={canEdit}
            contactoEmail={contacto?.email ?? ""}
            googleConnected={!!cuentaGoogle}
            fromEmail={cuentaGoogle?.email ?? null}
            plantillas={plantillas}
            mergeVars={merge.vars}
            mergeFields={merge.fields}
            productos={productos}
            oportunidadProductos={oportunidadProductos}
            oportunidadValor={o.valor}
            cotizaciones={cotizaciones}
            defaultMoneda={o.moneda}
            planesBloqueo={puedeReservar ? planesCatalogo.map((p) => ({ id: p.id, nombre: p.nombre, moneda: p.moneda })) : []}
            prefillBloqueo={{
              nombre_agente: contacto?.nombre ?? "",
              email_agente: contacto?.email ?? "",
              telefono_agente: contacto?.telefono ?? null,
              agencia_nombre: empresa?.nombre ?? null,
            }}
            tools={planTools}
          />

          {puedeReservar && (
            <>
              <PasajerosSection oportunidadId={id} initial={pasajeros} canEdit={canEdit} />
              <HabitacionesSection
                oportunidadId={id}
                habitaciones={habitaciones}
                pasajeros={pasajeros.map((p) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, habitacion_id: p.habitacion_id }))}
                canEdit={canEdit}
              />
              <CorreosTracking correos={correosTracking} />
              <ReservaPanel
                oportunidadId={id}
                planes={planesCatalogo.map((p) => ({ id: p.id, nombre: p.nombre, moneda: p.moneda }))}
                reservas={reservas}
                pasajeros={pasajeros.map((p) => ({ nombre: p.nombre, tipo: p.tipo }))}
              />
            </>
          )}

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
            Oportunidad creada el {fmtDate(o.creado_en)}
            {(() => {
              const creador = usuarios.find((u) => u.id === o.creado_por)?.nombre;
              return creador ? <> por <span className="font-medium text-gray-700">{creador}</span></> : null;
            })()}
            .
          </div>

          <HistorialSection entries={historialEntries} />
        </div>

        {/* Aside cards */}
        <div className="lg:col-span-1">
          {contacto && empresa && (
            <DetailAside
              oportunidad={{
                id: o.id,
                valor: o.valor,
                moneda: o.moneda,
                probabilidad_cierre: o.probabilidad_cierre,
                fecha_esperada_cierre: o.fecha_esperada_cierre,
                descripcion: o.descripcion,
                asignado_id: o.asignado_id,
                estrategia: o.estrategia,
                campos_custom: o.campos_custom,
              }}
              contacto={{
                id: contacto.id,
                nombre: contacto.nombre,
                cargo: contacto.cargo,
                email: contacto.email,
                telefono: contacto.telefono,
                telefono_whatsapp: contacto.telefono_whatsapp,
              }}
              empresa={{
                id: empresa.id,
                nombre: empresa.nombre,
                email: empresa.email,
                telefono: empresa.telefono,
                ciudad: empresa.ciudad,
                pais: empresa.pais,
                sitio_web: empresa.sitio_web,
              }}
              campos={campos}
              usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
