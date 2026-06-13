"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InlineEditField, type InlineEditType } from "@/components/ui/inline-edit";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { saveContactoField, saveContactoCampos } from "@/lib/actions/inline-edit";

export type AsideContactoFull = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  empresa_id: string;
  empresa_nombre: string;
  campos_custom: Record<string, unknown>;
};

function campoType(tipo: CampoPersonalizado["tipo"]): InlineEditType {
  if (tipo === "numero" || tipo === "moneda") return "number";
  if (tipo === "fecha") return "date";
  if (tipo === "seleccion" || tipo === "checkbox") return "select";
  if (tipo === "textarea") return "textarea";
  return "text";
}

export function ContactoAside({
  contacto,
  campos,
  canEdit,
}: {
  contacto: AsideContactoFull;
  campos: CampoPersonalizado[];
  canEdit: boolean;
}) {
  const c = contacto;
  const [campos_custom, setCampos] = useState<Record<string, unknown>>(c.campos_custom ?? {});
  // Sincroniza el estado local cuando el prop cambia (ej. actualizaciones del padre)
  useEffect(() => {
    setCampos(c.campos_custom ?? {});
  }, [c.campos_custom]);

  async function saveCampo(campo: CampoPersonalizado, value: string) {
    const tipo = campo.tipo;
    const parsed = tipo === "checkbox" ? value === "true" : value === "" ? null : value;
    // Normaliza el valor de checkbox a boolean para comparar de forma consistente
    // (puede venir como boolean o como string "true"/"false" desde la DB)
    const toBool = (raw: unknown): boolean => raw === true || raw === "true";
    const disp = (raw: unknown) =>
      tipo === "checkbox" ? (toBool(raw) ? "Sí" : "No") : raw == null || raw === "" ? "(vacío)" : String(raw);
    const desc = `Editó ${campo.etiqueta}: ${disp(campos_custom[campo.clave])} → ${disp(parsed)}`;
    const next = { ...campos_custom, [campo.clave]: parsed };
    const res = await saveContactoCampos(c.id, next, desc);
    if (res.ok) setCampos(next);
    return res;
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Datos del contacto</h2>
      <div className="divide-y divide-gray-50">
        <InlineEditField label="Nombre" value={c.nombre} editable={canEdit}
          onSave={(v) => saveContactoField(c.id, "nombre", v)} />
        <InlineEditField label="Cargo" value={c.cargo ?? ""} editable={canEdit}
          onSave={(v) => saveContactoField(c.id, "cargo", v)} />
        <InlineEditField label="Email" value={c.email} editable={canEdit}
          onSave={(v) => saveContactoField(c.id, "email", v)} />
        <InlineEditField label="Teléfono" value={c.telefono ?? ""} editable={canEdit}
          onSave={(v) => saveContactoField(c.id, "telefono", v)} />
        <InlineEditField label="WhatsApp" value={c.telefono_whatsapp ?? ""} editable={canEdit}
          onSave={(v) => saveContactoField(c.id, "telefono_whatsapp", v)} />

        <div className="py-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Empresa</p>
          <Link href={`/empresas/${c.empresa_id}`} className="mt-0.5 inline-block text-sm text-brand-primary hover:underline">
            {c.empresa_nombre}
          </Link>
        </div>

        {campos.map((cp) => {
          const raw = campos_custom[cp.clave];
          const valueStr = raw == null ? "" : String(raw);
          // Normaliza checkbox a boolean (acepta boolean o string "true"/"false" desde la DB)
          const rawBool = raw === true || raw === "true";
          const options =
            cp.tipo === "checkbox"
              ? [{ value: "true", label: "Sí" }, { value: "false", label: "No" }]
              : cp.tipo === "seleccion"
                ? [{ value: "", label: "—" }, ...(cp.opciones ?? []).map((o) => ({ value: o, label: o }))]
                : undefined;
          return (
            <InlineEditField
              key={cp.id}
              label={cp.etiqueta}
              type={campoType(cp.tipo)}
              options={options}
              value={cp.tipo === "checkbox" ? (rawBool ? "true" : "false") : valueStr}
              display={cp.tipo === "checkbox" ? (rawBool ? "Sí" : "No") : valueStr === "" ? "—" : valueStr}
              editable={canEdit}
              onSave={(v) => saveCampo(cp, v)}
            />
          );
        })}
      </div>
    </section>
  );
}
