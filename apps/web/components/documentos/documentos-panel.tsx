"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Download, Trash2 } from "lucide-react";
import type { Documento } from "@/lib/db/documentos";
import {
  uploadDocumentoAction,
  signDocumentoUrlAction,
  deleteDocumentoAction,
} from "@/lib/actions/documentos";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DocumentosPanel({
  entidad,
  entityId,
  initial,
  canEdit,
}: {
  entidad: "empresa" | "contacto" | "oportunidad";
  entityId: string;
  initial: Documento[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("entidad", entidad);
    fd.append("entity_id", entityId);
    fd.append("file", file);
    const res = await uploadDocumentoAction(fd);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) {
      setError(res.error ?? "No se pudo subir");
      return;
    }
    router.refresh();
  }

  async function onDownload(id: string) {
    const res = await signDocumentoUrlAction(id);
    if (res.ok && res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    else setError(res.error ?? "No se pudo abrir");
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    startTransition(async () => {
      const res = await deleteDocumentoAction(id);
      if (!res.ok) setError(res.error ?? "No se pudo eliminar");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Subiendo…" : "Subir documento"}
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
          <p className="mt-1 text-xs text-gray-400">Hasta 25 MB por archivo.</p>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>
      )}

      {initial.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No hay documentos todavía.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {initial.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5">
              <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{d.nombre}</p>
                <p className="text-xs text-gray-400">
                  {fmtSize(d.tamano_bytes)}
                  {d.subido_por_nombre ? ` · ${d.subido_por_nombre}` : ""} · {fmtDate(d.creado_en)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDownload(d.id)}
                className="text-gray-400 hover:text-brand-primary"
                title="Descargar"
                aria-label="Descargar"
              >
                <Download className="h-4 w-4" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete(d.id)}
                  disabled={pending}
                  className="text-gray-400 hover:text-status-danger"
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
