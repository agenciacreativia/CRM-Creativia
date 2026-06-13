"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  parseAndPreviewAction,
  commitImportAction,
  type ParsedPayload,
} from "./actions";
import type { ImportPreview } from "@/lib/import/preview";
import type { CommitResult } from "@/lib/import/commit";

type State =
  | { phase: "idle" }
  | { phase: "parsing" }
  | { phase: "preview"; preview: ImportPreview; parsed: ParsedPayload }
  | { phase: "committing"; preview: ImportPreview; parsed: ParsedPayload }
  | { phase: "done"; result: CommitResult }
  | { phase: "error"; message: string };

export function ImportForm() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleParse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setState({ phase: "parsing" });
    const res = await parseAndPreviewAction(formData);
    if (!res.ok) {
      setState({ phase: "error", message: res.error });
      return;
    }
    setState({ phase: "preview", preview: res.preview, parsed: res.parsed });
  }

  async function handleCommit() {
    if (state.phase !== "preview") return;
    setState({ ...state, phase: "committing" });
    const res = await commitImportAction(state.parsed);
    if (!res.ok) {
      setState({ phase: "error", message: res.error });
      return;
    }
    setState({ phase: "done", result: res.result });
    router.refresh();
  }

  function reset() {
    setState({ phase: "idle" });
    formRef.current?.reset();
  }

  return (
    <div className="space-y-6">
      {/* Upload form — always visible */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <form ref={formRef} onSubmit={handleParse} className="space-y-4">
          <FileField name="empresas"      label="Empresas (.xlsx)" hint="Columnas: Nombre, Correo, Teléfono, Dirección, Sitio web, Ciudad, País, Propietario" />
          <FileField name="contactos"     label="Contactos (.xlsx)" hint="Columnas: Nombre, Apellido, Correo, Teléfono, Propietario — se vinculan a empresas por correo" />
          <FileField name="oportunidades" label="Oportunidades (.xlsx)" hint="Columnas: Nombre, Correo, Estado (Abierto/Eliminado/Perdido/Ganado), Etapa, Embudo, Propietario" />

          <div className="pt-2 flex items-center gap-3">
            <Button type="submit" disabled={state.phase === "parsing" || state.phase === "committing"}>
              {state.phase === "parsing" ? "Procesando..." : "Procesar archivos"}
            </Button>
            {state.phase !== "idle" && (
              <Button type="button" variant="ghost" onClick={reset}>
                Reiniciar
              </Button>
            )}
          </div>
        </form>
      </section>

      {state.phase === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-status-danger">
          {state.message}
        </div>
      )}

      {(state.phase === "preview" || state.phase === "committing") && (
        <PreviewPanel
          preview={state.preview}
          onConfirm={handleCommit}
          committing={state.phase === "committing"}
        />
      )}

      {state.phase === "done" && <DonePanel result={state.result} />}
    </div>
  );
}

function FileField({ name, label, hint }: { name: string; label: string; hint: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="file"
        name={name}
        accept=".xlsx,.xls"
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-primary file:text-white hover:file:bg-blue-700 file:cursor-pointer"
      />
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function PreviewPanel({
  preview,
  onConfirm,
  committing,
}: {
  preview: ImportPreview;
  onConfirm: () => void;
  committing: boolean;
}) {
  const totalWarnings =
    preview.contactos.warnings.length + preview.oportunidades.warnings.length;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <h2 className="text-lg font-bold">Vista previa</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Empresas a crear" value={preview.empresas.total} />
        <Stat label="Contactos a crear" value={preview.contactos.total} />
        <Stat label="Oportunidades a crear" value={preview.oportunidades.total} />
      </div>

      {preview.pipelines_to_create.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <p className="font-medium text-blue-900 mb-1">Se crearán nuevos pipelines/etapas:</p>
          <ul className="text-blue-800 space-y-1">
            {preview.pipelines_to_create.map((p, i) => (
              <li key={i}>
                <strong>{p.nombre}</strong>: {p.etapas.join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.empresas.sample.length > 0 && (
        <SamplePreview
          title="Primeras empresas"
          rows={preview.empresas.sample.map((r) => `${r.nombre} (${r.ciudad ?? "—"})`)}
        />
      )}

      {preview.contactos.sample.length > 0 && (
        <SamplePreview
          title="Primeros contactos"
          rows={preview.contactos.sample.map(
            (c) => `${c.nombre} → ${c.empresa_match ?? "sin empresa"}`,
          )}
        />
      )}

      {preview.oportunidades.sample.length > 0 && (
        <SamplePreview
          title="Primeras oportunidades"
          rows={preview.oportunidades.sample.map(
            (o) =>
              `${o.nombre} · ${o.estado} · ${o.pipeline ?? "—"}/${o.etapa ?? "—"} · asignado: ${o.asignado ?? "—"}`,
          )}
        />
      )}

      {totalWarnings > 0 && (
        <details className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-yellow-900">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {totalWarnings} advertencias
          </summary>
          <ul className="mt-2 space-y-1 text-yellow-900 list-disc list-inside">
            {[...preview.contactos.warnings, ...preview.oportunidades.warnings].map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {preview.duplicates.empresas.length > 0 && (
        <p className="text-sm text-status-danger">
          Empresas duplicadas dentro del archivo (se importará solo una):{" "}
          {preview.duplicates.empresas.join(", ")}
        </p>
      )}

      <div className="pt-2 flex items-center gap-3">
        <Button onClick={onConfirm} disabled={committing}>
          {committing ? "Importando..." : "Confirmar importación"}
        </Button>
        <p className="text-xs text-gray-500">
          La importación es idempotente: empresas/contactos existentes no se duplican.
        </p>
      </div>
    </section>
  );
}

function SamplePreview({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <ul className="text-sm text-gray-600 space-y-0.5 font-mono">
        {rows.map((r, i) => (
          <li key={i}>· {r}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded p-4 border border-gray-200">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function DonePanel({ result }: { result: CommitResult }) {
  return (
    <section className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h2 className="text-lg font-bold text-green-900">✓ Importación completa</h2>
      <ul className="mt-3 text-sm text-green-900 space-y-1">
        <li>✓ Empresas creadas: <strong>{result.empresas_creadas}</strong></li>
        <li>✓ Contactos creados: <strong>{result.contactos_creados}</strong></li>
        <li>✓ Oportunidades creadas: <strong>{result.oportunidades_creadas}</strong></li>
        {result.pipelines_creados > 0 && (
          <li>✓ Pipelines creados: <strong>{result.pipelines_creados}</strong></li>
        )}
        {result.etapas_creadas > 0 && (
          <li>✓ Etapas creadas: <strong>{result.etapas_creadas}</strong></li>
        )}
        {result.contactos_sin_empresa > 0 && (
          <li className="flex items-center gap-1.5 text-yellow-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Contactos sin empresa (no importados): <strong>{result.contactos_sin_empresa}</strong>
          </li>
        )}
        {result.oportunidades_sin_asignado > 0 && (
          <li className="flex items-center gap-1.5 text-yellow-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Oportunidades con propietario sin match: <strong>{result.oportunidades_sin_asignado}</strong>
          </li>
        )}
      </ul>
    </section>
  );
}
