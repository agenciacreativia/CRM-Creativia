"use client";

import { useEffect, useState } from "react";
import { InlineEditField, type InlineEditType } from "@/components/ui/inline-edit";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { saveEmpresaField, saveEmpresaCampos } from "@/lib/actions/inline-edit";

export type AsideEmpresaFull = {
  id: string;
  nombre: string;
  estado_empresa: string;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  sitio_web: string | null;
  descripcion: string | null;
  campos_custom: Record<string, unknown>;
};

function campoType(tipo: CampoPersonalizado["tipo"]): InlineEditType {
  if (tipo === "numero" || tipo === "moneda") return "number";
  if (tipo === "fecha") return "date";
  if (tipo === "seleccion" || tipo === "checkbox") return "select";
  if (tipo === "textarea") return "textarea";
  return "text";
}

export function EmpresaAside({
  empresa,
  campos,
  canEdit,
}: {
  empresa: AsideEmpresaFull;
  campos: CampoPersonalizado[];
  canEdit: boolean;
}) {
  const e = empresa;
  const [campos_custom, setCampos] = useState<Record<string, unknown>>(e.campos_custom ?? {});

  // Sincroniza el estado local cuando el padre recibe nuevos datos del servidor
  useEffect(() => {
    setCampos(e.campos_custom ?? {});
  }, [e.campos_custom]);

  async function saveCampo(campo: CampoPersonalizado, value: string) {
    const tipo = campo.tipo;
    const parsed = tipo === "checkbox" ? value === "true" : value === "" ? null : value;
    const disp = (raw: unknown) =>
      tipo === "checkbox" ? (raw ? "Sí" : "No") : raw == null || raw === "" ? "(vacío)" : String(raw);
    const desc = `Editó ${campo.etiqueta}: ${disp(campos_custom[campo.clave])} → ${disp(parsed)}`;
    const next = { ...campos_custom, [campo.clave]: parsed };
    const res = await saveEmpresaCampos(e.id, next, desc);
    if (res.ok) setCampos(next);
    return res;
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Datos de la empresa</h2>
      <div className="divide-y divide-gray-50">
        <InlineEditField label="Nombre" value={e.nombre} editable={canEdit}
          onSave={(v) => saveEmpresaField(e.id, "nombre", v)} />
        <InlineEditField label="Estado" type="select" value={e.estado_empresa} editable={canEdit}
          options={[
            { value: "prospecto", label: "Prospecto" },
            { value: "cliente", label: "Cliente" },
            { value: "inactivo", label: "Inactivo" },
          ]}
          onSave={(v) => saveEmpresaField(e.id, "estado_empresa", v)} />
        <InlineEditField label="Email" type="email" value={e.email ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(e.id, "email", v)} />
        <InlineEditField label="Teléfono" value={e.telefono ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(e.id, "telefono", v)} />
        <InlineEditField label="Ciudad" value={e.ciudad ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(e.id, "ciudad", v)} />
        <InlineEditField label="País" value={e.pais ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(e.id, "pais", v)} />
        <InlineEditField label="Sitio web" value={e.sitio_web ?? ""} editable={canEdit}
          onSave={(v) => saveEmpresaField(e.id, "sitio_web", v)} />

        {campos.map((c) => {
          const raw = campos_custom[c.clave];
          const valueStr = raw == null ? "" : String(raw);
          const options =
            c.tipo === "checkbox"
              ? [{ value: "true", label: "Sí" }, { value: "false", label: "No" }]
              : c.tipo === "seleccion"
                ? [{ value: "", label: "—" }, ...(c.opciones ?? []).map((o) => ({ value: o, label: o }))]
                : undefined;
          return (
            <InlineEditField
              key={c.id}
              label={c.etiqueta}
              type={campoType(c.tipo)}
              options={options}
              value={c.tipo === "checkbox" ? (raw ? "true" : "false") : valueStr}
              display={c.tipo === "checkbox" ? (raw ? "Sí" : "No") : valueStr === "" ? "—" : valueStr}
              editable={canEdit}
              onSave={(v) => saveCampo(c, v)}
            />
          );
        })}
      </div>
    </section>
  );
}
