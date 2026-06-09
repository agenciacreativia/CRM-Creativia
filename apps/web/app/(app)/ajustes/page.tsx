import Link from "next/link";
import {
  ShieldCheck, ChevronRight, Package2, Building2, Zap, ListOrdered, Globe, Store, CreditCard, Gem, MapPinned,
  Plug, Database, ClipboardList, GitMerge, Percent, MessageCircle, UserCog, Mail, Settings as SettingsIcon,
} from "lucide-react";
import { getCuentaGoogle } from "@/lib/db/google";
import { listPlantillas } from "@/lib/db/plantillas";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin, getTenantHerramientas } from "@/lib/db/planes";
import { GoogleConnection } from "./google-connection";
import { PlantillasManager } from "./plantillas-manager";
import { PageHeader } from "@/components/ui/page-header";

type SearchParams = Promise<{ google?: string }>;

const MESSAGES: Record<string, { text: string; tone: "ok" | "err" }> = {
  connected: { text: "Cuenta de Google conectada correctamente.", tone: "ok" },
  denied: { text: "Cancelaste la conexión con Google.", tone: "err" },
  error: { text: "No se pudo completar la conexión. Intentá de nuevo.", tone: "err" },
  not_configured: { text: "Google OAuth no está configurado en el servidor.", tone: "err" },
};

function Card({ href, icon: Icon, title, sub, accent = false }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; sub: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${accent ? "border-brand-navy/30 bg-brand-navy/[0.03] hover:bg-brand-navy/[0.06]" : "border-gray-200 bg-white hover:bg-gray-50"}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-brand-navy" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">{title}</h3>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </Link>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{children}</h2>;
}

export default async function AjustesPage({ searchParams }: { searchParams: SearchParams }) {
  const { google } = await searchParams;
  const [cuenta, plantillas, me, esPlataforma, herramientas] = await Promise.all([
    getCuentaGoogle(),
    listPlantillas(),
    getSessionUser(),
    isPlatformAdmin(),
    getTenantHerramientas(),
  ]);
  const msg = google ? MESSAGES[google] : null;
  const isAdmin = me?.rol === "admin";
  const tiene = (k: string) => herramientas === null || herramientas.has(k);
  const puedeRoles = isAdmin && tiene("roles_permisos");
  const puedeGoogle = tiene("google_integracion");
  const puedePlantillas = tiene("plantillas_correo");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ajustes"
        subtitle="Configuración general, equipo, datos y plataforma."
      />

      {msg && (
        <div className={"rounded-md border p-3 text-sm " + (msg.tone === "ok" ? "border-green-200 bg-green-50 text-gray-800" : "border-red-200 bg-red-50 text-status-danger")}>
          {msg.text}
        </div>
      )}

      {/* === EQUIPO === */}
      {isAdmin && (
        <>
          <GroupTitle>Equipo</GroupTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card href="/admin/usuarios" icon={UserCog} title="Usuarios" sub="Miembros del equipo, alta y edición" />
            {puedeRoles && <Card href="/ajustes/roles" icon={ShieldCheck} title="Roles y permisos" sub="Roles personalizados e invitaciones" />}
            <Card href="/ajustes/cuenta" icon={Building2} title="Cuenta de mi agencia" sub="Datos de la empresa, logo, dominio, moneda" />
          </div>
        </>
      )}

      {/* === DATOS === */}
      {isAdmin && (
        <>
          <GroupTitle>Datos</GroupTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card href="/admin/datos" icon={Database} title="Gestión de datos" sub="Importar, exportar, pipelines, campos, motivos" />
            <Card href="/admin/auditoria" icon={ClipboardList} title="Auditoría" sub="Registro de cambios del equipo" />
            <Card href="/admin/duplicados" icon={GitMerge} title="Duplicados" sub="Detección y fusión" />
          </div>
        </>
      )}

      {/* === ANÁLISIS === */}
      {isAdmin && (
        <>
          <GroupTitle>Análisis y métricas</GroupTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card href="/comisiones" icon={Percent} title="Comisiones" sub="Comisiones por asesor y cumplimiento" />
            <Card href="/nps" icon={MessageCircle} title="NPS post-viaje" sub="Score, envíos y respuestas" />
          </div>
        </>
      )}

      {/* === COMERCIAL === */}
      {isAdmin && (
        <>
          <GroupTitle>Comercial</GroupTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card href="/ajustes/comercial" icon={Gem} title="Configuración comercial" sub="Niveles de viajero (RFM) y tipo de cambio" />
            <Card href="/ajustes/territorios" icon={MapPinned} title="Plan territorial" sub="Zonas y metas comerciales" />
            <Card href="/ajustes/automatizaciones" icon={Zap} title="Automatizaciones" sub="Reglas que crean tareas y etiquetas" />
            <Card href="/ajustes/secuencias" icon={ListOrdered} title="Secuencias" sub="Cadencias de seguimiento" />
            <Card href="/ajustes/captura" icon={Globe} title="Captura de leads" sub="Formulario embebible en tu web" />
          </div>
        </>
      )}

      {/* === INTEGRACIONES === */}
      {isAdmin && (
        <>
          <GroupTitle>Integraciones</GroupTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card href="/ajustes/integraciones" icon={Plug} title="API y webhooks" sub="API pública, webhooks, reportes programados, 2FA" />
          </div>
        </>
      )}

      {/* === PLATAFORMA === */}
      {esPlataforma && (
        <>
          <GroupTitle>Plataforma (Súper-admin)</GroupTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card href="/ajustes/catalogo" icon={Store} title="Catálogo mayorista" sub="Tu inventario para las agencias" accent />
            <Card href="/ajustes/agencias" icon={Building2} title="Agencias" sub="Alta, plan y prueba gratuita" accent />
            <Card href="/ajustes/planes" icon={Package2} title="Planes y licencias" sub="Módulos, acciones y herramientas" accent />
            <Card href="/ajustes/facturacion" icon={CreditCard} title="Facturación" sub="Suscripciones · Stripe" accent />
          </div>
        </>
      )}

      {/* === Conexiones y plantillas (en línea) === */}
      {(puedeGoogle || puedePlantillas) && (
        <>
          <GroupTitle>Conexiones</GroupTitle>
          {puedeGoogle && (
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                <SettingsIcon className="h-4 w-4" /> Integración con Google
              </h2>
              <p className="mb-4 text-xs text-gray-400">Gmail · Calendar · Tareas</p>
              <GoogleConnection email={cuenta?.email ?? null} syncEnabled={cuenta?.syncActividades ?? true} />
            </section>
          )}

          {puedePlantillas && (
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                <Mail className="h-4 w-4" /> Plantillas de correo
              </h2>
              <p className="mb-4 text-xs text-gray-400">Reutilizables al redactar correos</p>
              <PlantillasManager initial={plantillas} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
