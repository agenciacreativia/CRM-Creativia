"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { PickerData } from "@/lib/db/picker-data";

export type OportunidadFormValues = {
  nombre: string;
  empresa_id: string;
  contacto_id: string;
  pipeline_id: string;
  etapa_id: string;
  asignado_id: string | null;
  valor: number | null;
  moneda: string;
  estado: "activo" | "ganado" | "perdido" | "eliminado";
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  motivo_perdida_id: string | null;
  observaciones_perdida: string | null;
  descripcion: string | null;
};

type Props = {
  mode: "create" | "edit";
  initial?: Partial<OportunidadFormValues>;
  picker: PickerData;
  isPending: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  cancelHref: string;
  /** Extra fields (e.g. custom fields) rendered just before the action buttons. */
  extraFields?: React.ReactNode;
};

const MONEDAS = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"];

export function OportunidadForm(props: Props) {
  const { mode, initial, picker, isPending, error, fieldErrors: e, cancelHref, extraFields } = props;

  const defaultEmpresa = initial?.empresa_id ?? picker.empresas[0]?.id ?? "";
  const defaultPipeline =
    initial?.pipeline_id ?? picker.pipelines.find((p) => p.es_default)?.id ?? picker.pipelines[0]?.id ?? "";

  const [empresaId, setEmpresaId] = useState(defaultEmpresa);
  const [pipelineId, setPipelineId] = useState(defaultPipeline);
  const [estado, setEstado] = useState<OportunidadFormValues["estado"]>(
    (initial?.estado as OportunidadFormValues["estado"]) ?? "activo",
  );

  const contactosFiltrados = picker.contactos.filter((c) => c.empresa_id === empresaId);
  const etapasFiltradas = picker.etapas.filter((e) => e.pipeline_id === pipelineId);

  const [contactoId, setContactoId] = useState(
    initial?.contacto_id ?? contactosFiltrados[0]?.id ?? "",
  );
  const [etapaId, setEtapaId] = useState(initial?.etapa_id ?? etapasFiltradas[0]?.id ?? "");

  // When empresa changes, snap contacto_id to a valid value (first of filtered list)
  useEffect(() => {
    if (contactosFiltrados.length === 0) {
      setContactoId("");
      return;
    }
    const stillValid = contactosFiltrados.some((c) => c.id === contactoId);
    if (!stillValid) setContactoId(contactosFiltrados[0].id);
  }, [empresaId, contactosFiltrados, contactoId]);

  // Same for etapa when pipeline changes
  useEffect(() => {
    if (etapasFiltradas.length === 0) {
      setEtapaId("");
      return;
    }
    const stillValid = etapasFiltradas.some((s) => s.id === etapaId);
    if (!stillValid) setEtapaId(etapasFiltradas[0].id);
  }, [pipelineId, etapasFiltradas, etapaId]);

  const hasFieldErrors = Object.keys(e).length > 0;

  return (
    <div className="space-y-5">
      {(error || hasFieldErrors) && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">
          {error ?? "Revisá los campos marcados en rojo abajo."}
          {hasFieldErrors && !error && (
            <ul className="mt-1 list-disc list-inside text-xs">
              {Object.entries(e).map(([k, v]) => (
                <li key={k}><strong>{k}</strong>: {v}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Field label="Nombre" htmlFor="nombre" required error={e.nombre}>
        <Input id="nombre" name="nombre" defaultValue={initial?.nombre ?? ""} required />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Empresa" htmlFor="empresa_id" required error={e.empresa_id}>
          <Select
            id="empresa_id"
            name="empresa_id"
            value={empresaId}
            onChange={(ev) => setEmpresaId(ev.target.value)}
            required
          >
            {picker.empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </Select>
        </Field>

        <Field
          label="Contacto"
          htmlFor="contacto_id"
          required
          error={e.contacto_id}
          hint={contactosFiltrados.length === 0 ? "Esta empresa no tiene contactos. Creá uno primero." : undefined}
        >
          <Select
            id="contacto_id"
            name="contacto_id"
            value={contactoId}
            onChange={(ev) => setContactoId(ev.target.value)}
            required
            disabled={contactosFiltrados.length === 0}
          >
            {contactosFiltrados.length === 0 ? (
              <option value="">(sin contactos)</option>
            ) : (
              contactosFiltrados.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))
            )}
          </Select>
        </Field>

        <Field label="Embudo" htmlFor="pipeline_id" required error={e.pipeline_id}>
          <Select
            id="pipeline_id"
            name="pipeline_id"
            value={pipelineId}
            onChange={(ev) => setPipelineId(ev.target.value)}
            required
          >
            {picker.pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </Field>

        <Field label="Etapa" htmlFor="etapa_id" required error={e.etapa_id}>
          <Select
            id="etapa_id"
            name="etapa_id"
            value={etapaId}
            onChange={(ev) => setEtapaId(ev.target.value)}
            required
            disabled={etapasFiltradas.length === 0}
          >
            {etapasFiltradas.length === 0 ? (
              <option value="">(sin etapas)</option>
            ) : (
              etapasFiltradas.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))
            )}
          </Select>
        </Field>

        <Field label="Asignado a" htmlFor="asignado_id" error={e.asignado_id}>
          <Select id="asignado_id" name="asignado_id" defaultValue={initial?.asignado_id ?? ""}>
            <option value="">(no asignado)</option>
            {picker.usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} · {u.rol}</option>
            ))}
          </Select>
        </Field>

        <Field label="Estado" htmlFor="estado" error={e.estado}>
          <Select
            id="estado"
            name="estado"
            value={estado}
            onChange={(ev) => setEstado(ev.target.value as OportunidadFormValues["estado"])}
          >
            <option value="activo">Activa</option>
            <option value="ganado">Ganada</option>
            <option value="perdido">Perdida</option>
            <option value="eliminado">Eliminada</option>
          </Select>
        </Field>

        <Field label="Valor" htmlFor="valor" error={e.valor}>
          <Input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.valor ?? ""}
            placeholder="0.00"
          />
        </Field>

        <Field label="Moneda" htmlFor="moneda" error={e.moneda}>
          <Select id="moneda" name="moneda" defaultValue={initial?.moneda ?? "USD"}>
            {MONEDAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>

        <Field label="Probabilidad de cierre (%)" htmlFor="probabilidad_cierre" error={e.probabilidad_cierre}>
          <Input
            id="probabilidad_cierre"
            name="probabilidad_cierre"
            type="number"
            min="0"
            max="100"
            defaultValue={initial?.probabilidad_cierre ?? ""}
          />
        </Field>

        <Field label="Fecha esperada de cierre" htmlFor="fecha_esperada_cierre" error={e.fecha_esperada_cierre}>
          <Input
            id="fecha_esperada_cierre"
            name="fecha_esperada_cierre"
            type="date"
            defaultValue={initial?.fecha_esperada_cierre ?? ""}
          />
        </Field>
      </div>

      {/* Conditional fields for "perdido" state */}
      {estado === "perdido" && (
        <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
          <p className="text-sm font-medium text-status-danger">Motivo de pérdida (requerido)</p>
          <Field label="Motivo" htmlFor="motivo_perdida_id" required error={e.motivo_perdida_id}>
            <Select id="motivo_perdida_id" name="motivo_perdida_id" defaultValue={initial?.motivo_perdida_id ?? ""} required>
              <option value="">— seleccionar —</option>
              {picker.motivos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Observaciones" htmlFor="observaciones_perdida" error={e.observaciones_perdida}>
            <Textarea
              id="observaciones_perdida"
              name="observaciones_perdida"
              rows={3}
              defaultValue={initial?.observaciones_perdida ?? ""}
              placeholder="Detalles adicionales sobre por qué se perdió la oportunidad..."
            />
          </Field>
        </div>
      )}

      <Field label="Descripción" htmlFor="descripcion" error={e.descripcion}>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          defaultValue={initial?.descripcion ?? ""}
        />
      </Field>

      {extraFields}

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <Button
          type="submit"
          disabled={isPending || contactosFiltrados.length === 0 || etapasFiltradas.length === 0}
        >
          {isPending ? "Guardando..." : mode === "create" ? "Crear oportunidad" : "Guardar cambios"}
        </Button>
        <Link href={cancelHref} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancelar
        </Link>
        {(contactosFiltrados.length === 0 || etapasFiltradas.length === 0) && (
          <p className="text-xs text-status-danger">
            {contactosFiltrados.length === 0 ? "Necesitás un contacto en esta empresa. " : ""}
            {etapasFiltradas.length === 0 ? "Necesitás al menos una etapa en este pipeline." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
