"use client";

import { useState } from "react";
import Link from "next/link";
import { InlineEditField, type InlineEditType } from "@/components/ui/inline-edit";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { ESTRATEGIAS, ESTRATEGIA_LABEL } from "@/lib/estrategias-types";
import {
  saveOportunidadField,
  saveOportunidadCampos,
  saveContactoField,
  saveEmpresaField,
} from "@/lib/actions/inline-edit";

type Usuario = { id: string; nombre: string };

export type AsideOportunidad = {
  id: string;
  valor: number | null;
  moneda: string;
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  descripcion: string | null;
  asignado_id: string | null;
  estrategia: string | null;
  campos_custom: Record<string, unknown>;
};
export type AsideContacto = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
};
export type AsideEmpresa = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  sitio_web: string | null;
};

const fmtCurrency = (v: number | null, moneda: string) =>
  v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: moneda }).format(v);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" }) : "—";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="divide-y divide-gray-50">{children}</div>
    </section>
  );
}

function campoType(tipo: CampoPersonalizado["tipo"]): InlineEditType {
  if (tipo === "numero" || tipo === "moneda") return "number";
  if (tipo === "fecha") return "date";
  if (tipo === "seleccion" || tipo === "checkbox") return "select";
  if (tipo === "textarea") return "textarea";
  return "text";
}

export function DetailAside({
  oportunidad,
  contacto,
  empresa,
  campos,
  usuarios,
  canEdit,
}: {
  oportunidad: AsideOportunidad;
  contacto: AsideContacto;
  empresa: AsideEmpresa;
  campos: CampoPersonalizado[];
  usuarios: Usuario[];
  canEdit: boolean;
}) {
  const o = oportunidad;
  const [campos_custom, setCampos] = useState<Record<string, unknown>>(o.campos_custom ?? {});

  const asignadoOptions = [
    { value: "", label: "Sin asignar" },
    ...usuarios.map((u) => ({ value: u.id, label: u.nombre })),
  ];

  async function saveCampo(campo: CampoPersonalizado, value: string) {
    const tipo = campo.tipo;
    const parsed =
      tipo === "checkbox"
        ? value === "true"
        : tipo === "numero" || tipo === "moneda"
          ? value === ""
            ? null
            : Number(value)
          : value === ""
            ? null
            : value;
    const disp = (raw: unknown) =>
      tipo === "checkbox" ? (raw ? "Sí" : "No") : raw == null || raw === "" ? "(vacío)" : String(raw);
    const desc = `Editó ${campo.etiqueta}: ${disp(campos_custom[campo.clave])} → ${disp(parsed)}`;
    const next = { ...campos_custom, [campo.clave]: parsed };
    const res = await saveOportunidadCampos(o.id, next, desc);
    if (res.ok) setCampos(next);
    return res;
  }

  return (
    <div className="space-y-4">
      {/* Oportunidad */}
      <Card title="Datos de la oportunidad">
        <InlineEditField
          label="Valor"
          type="number"
          value={o.valor == null ? "" : String(o.valor)}
          display={fmtCurrency(o.valor, o.moneda)}
          editable={canEdit}
          onSave={(v) => saveOportunidadField(o.id, "valor", v)}
        />
        <InlineEditField
          label="Probabilidad (%)"
          type="number"
          value={o.probabilidad_cierre == null ? "" : String(o.probabilidad_cierre)}
          display={o.probabilidad_cierre == null ? "—" : `${o.probabilidad_cierre}%`}
          editable={canEdit}
          onSave={(v) => saveOportunidadField(o.id, "probabilidad_cierre", v)}
        />
        <InlineEditField
          label="Cierre esperado"
          type="date"
          value={o.fecha_esperada_cierre ?? ""}
          display={fmtDate(o.fecha_esperada_cierre)}
          editable={canEdit}
          onSave={(v) => saveOportunidadField(o.id, "fecha_esperada_cierre", v)}
        />
        <InlineEditField
          label="Asignado"
          type="select"
          options={asignadoOptions}
          value={o.asignado_id ?? ""}
          display={usuarios.find((u) => u.id === o.asignado_id)?.nombre ?? "Sin asignar"}
          editable={canEdit}
          onSave={(v) => saveOportunidadField(o.id, "asignado_id", v)}
        />
        <InlineEditField
          label="Estrategia"
          type="select"
          options={[{ value: "", label: "—" }, ...ESTRATEGIAS.map((s) => ({ value: s.key, label: s.label }))]}
          value={o.estrategia ?? ""}
          display={o.estrategia ? (ESTRATEGIA_LABEL[o.estrategia] ?? o.estrategia) : "Sin estrategia"}
          editable={canEdit}
          onSave={(v) => saveOportunidadField(o.id, "estrategia", v)}
        />
        <InlineEditField
          label="Descripción"
          type="textarea"
          value={o.descripcion ?? ""}
          editable={canEdit}
          onSave={(v) => saveOportunidadField(o.id, "descripcion", v)}
        />

        {campos.map((c) => {
          const raw = campos_custom[c.clave];
          const valueStr = raw == null ? "" : String(raw);
          const display =
            c.tipo === "checkbox" ? (raw ? "Sí" : "No") : valueStr === "" ? "—" : valueStr;
          const options =
            c.tipo === "checkbox"
              ? [
                  { value: "true", label: "Sí" },
                  { value: "false", label: "No" },
                ]
              : c.tipo === "seleccion"
                ? [{ value: "", label: "—" }, ...(c.opciones ?? []).map((o2) => ({ value: o2, label: o2 }))]
                : undefined;
          return (
            <InlineEditField
              key={c.id}
              label={c.etiqueta}
              type={campoType(c.tipo)}
              options={options}
              value={c.tipo === "checkbox" ? (raw ? "true" : "false") : valueStr}
              display={display}
              editable={canEdit}
              onSave={(v) => saveCampo(c, v)}
            />
          );
        })}
      </Card>

      {/* Contacto */}
      <Card title="Contacto">
        <InlineEditField label="Nombre" value={contacto.nombre} editable={canEdit}
          onSave={(v) => saveContactoField(contacto.id, "nombre", v)} />
        <InlineEditField label="Cargo" value={contacto.cargo ?? ""} editable={canEdit}
          onSave={(v) => saveContactoField(contacto.id, "cargo", v)} />
        <InlineEditField label="Email" value={contacto.email} editable={canEdit}
          onSave={(v) => saveContactoField(contacto.id, "email", v)} />
        <InlineEditField label="Teléfono" value={contacto.telefono ?? ""} editable={canEdit}
          onSave={(v) => saveContactoField(contacto.id, "telefono", v)} />
        <InlineEditField label="WhatsApp" value={contacto.telefono_whatsapp ?? ""} editable={canEdit}
          onSave={(v) => saveContactoField(contacto.id, "telefono_whatsapp", v)} />
        <Link href={`/contactos/${contacto.id}`} className="mt-2 inline-block text-xs text-brand-primary hover:underline">
          Ver contacto →
        </Link>
      </Card>

      {/* Empresa */}
      <Card title="Empresa">
        <InlineEditField label="Nombre" value={empresa.nombre} editable={canEdit}
          onSave={(v) => saveEmpresaField(empresa.id, "nombre", v)} />
        <InlineEditField label="Email" value={empresa.email ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(empresa.id, "email", v)} />
        <InlineEditField label="Teléfono" value={empresa.telefono ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(empresa.id, "telefono", v)} />
        <InlineEditField label="Ciudad" value={empresa.ciudad ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(empresa.id, "ciudad", v)} />
        <InlineEditField label="País" value={empresa.pais ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(empresa.id, "pais", v)} />
        <InlineEditField label="Sitio web" value={empresa.sitio_web ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(empresa.id, "sitio_web", v)} />
        <Link href={`/empresas/${empresa.id}`} className="mt-2 inline-block text-xs text-brand-primary hover:underline">
          Ver empresa →
        </Link>
      </Card>
    </div>
  );
}
