"use client";

import { useState } from "react";
import { Phone, Mail, Calendar, Luggage, Receipt, StickyNote, Paperclip, type LucideIcon } from "lucide-react";
import { ActividadesSection } from "@/components/oportunidad/actividades-section";
import { NotasSection } from "@/components/notas/notas-section";
import { DocumentosPanel } from "@/components/documentos/documentos-panel";
import { EmailCompose } from "@/components/oportunidad/email-compose";
import { EventCompose } from "@/components/oportunidad/event-compose";
import { CotizacionBuilder } from "./cotizacion-builder";
import type { PlanLite, ContactoPrefill } from "./cotizacion-bloqueo-form";
import { OportunidadProductos } from "./oportunidad-productos";
import type { Cotizacion } from "@/lib/cotizacion/types";
import type { Actividad } from "@/lib/db/actividades";
import type { Nota } from "@/lib/db/notas";
import type { Documento } from "@/lib/db/documentos";
import type { PlantillaCorreo } from "@/lib/db/plantillas";
import type { MergeVars, MergeField } from "@/lib/email/merge";
import type { Producto } from "@/lib/db/productos";
import type { OportunidadProducto } from "@/lib/db/oportunidad-productos";

type TabKey = "llamada" | "email" | "reunion" | "productos" | "cotizacion" | "notas" | "documentos";

export type PlanTools = {
  correo: boolean;
  reunionGoogle: boolean;
  productos: boolean;
  cotizacion: boolean;
  documentos: boolean;
};

const ALL_TABS: { key: TabKey; label: string; icon: LucideIcon; tool?: keyof PlanTools }[] = [
  { key: "llamada", label: "Llamada", icon: Phone },
  { key: "email", label: "Correo", icon: Mail, tool: "correo" },
  { key: "reunion", label: "Reunión", icon: Calendar },
  { key: "productos", label: "Productos", icon: Luggage, tool: "productos" },
  { key: "cotizacion", label: "Cotización", icon: Receipt, tool: "cotizacion" },
  { key: "notas", label: "Notas", icon: StickyNote },
  { key: "documentos", label: "Documentos", icon: Paperclip, tool: "documentos" },
];

export function ActivityTabs({
  oportunidadId,
  actividades,
  notas,
  documentos,
  currentUserId,
  currentUserIsAdmin,
  canEdit,
  contactoEmail,
  googleConnected,
  fromEmail,
  plantillas,
  mergeVars,
  mergeFields,
  productos,
  oportunidadProductos,
  oportunidadValor,
  cotizaciones,
  defaultMoneda,
  planesBloqueo,
  prefillBloqueo,
  tools,
}: {
  oportunidadId: string;
  actividades: Actividad[];
  notas: Nota[];
  documentos: Documento[];
  currentUserId: string;
  currentUserIsAdmin: boolean;
  canEdit: boolean;
  contactoEmail: string;
  googleConnected: boolean;
  fromEmail: string | null;
  plantillas: PlantillaCorreo[];
  mergeVars: MergeVars;
  mergeFields: MergeField[];
  productos: Producto[];
  oportunidadProductos: OportunidadProducto[];
  oportunidadValor: number | null;
  cotizaciones: Cotizacion[];
  defaultMoneda: string;
  planesBloqueo?: PlanLite[];
  prefillBloqueo?: ContactoPrefill;
  tools: PlanTools;
}) {
  const TABS = ALL_TABS.filter((t) => !t.tool || tools[t.tool]);
  const [tab, setTab] = useState<TabKey>("llamada");

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-gray-100 px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "email" && (
          <EmailCompose
            oportunidadId={oportunidadId}
            defaultTo={contactoEmail}
            googleConnected={googleConnected}
            fromEmail={fromEmail}
            plantillas={plantillas}
            mergeVars={mergeVars}
            mergeFields={mergeFields}
            productos={productos}
            documentos={documentos}
          />
        )}
        {tab === "reunion" && tools.reunionGoogle && (
          <EventCompose
            oportunidadId={oportunidadId}
            contactoEmail={contactoEmail}
            googleConnected={googleConnected}
          />
        )}
        {(tab === "llamada" || tab === "email" || tab === "reunion") && (
          <ActividadesSection oportunidadId={oportunidadId} initial={actividades} soloTipo={tab} bare />
        )}
        {tab === "notas" && (
          <NotasSection
            initial={notas}
            target={{ tipo: "oportunidad", entity_id: oportunidadId }}
            currentUserId={currentUserId}
            currentUserIsAdmin={currentUserIsAdmin}
            bare
          />
        )}
        {tab === "productos" && (
          <OportunidadProductos
            oportunidadId={oportunidadId}
            productos={productos}
            initial={oportunidadProductos}
            defaultMoneda={defaultMoneda}
            oportunidadValor={oportunidadValor}
            canEdit={canEdit}
          />
        )}
        {tab === "cotizacion" && (
          <CotizacionBuilder
            oportunidadId={oportunidadId}
            productos={productos}
            initial={cotizaciones}
            defaultMoneda={defaultMoneda}
            planes={planesBloqueo}
            prefill={prefillBloqueo}
          />
        )}
        {tab === "documentos" && (
          <DocumentosPanel
            entidad="oportunidad"
            entityId={oportunidadId}
            initial={documentos}
            canEdit={canEdit}
          />
        )}
      </div>
    </section>
  );
}
