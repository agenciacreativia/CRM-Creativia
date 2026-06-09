"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Paperclip, Trash2, Upload, Download, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { setImagenAction, addAdjuntoAction, removeAdjuntoAction, reorderAdjuntosAction, getAdjuntoUrlAction } from "./actions";

type Adjunto = { path: string; nombre: string; tipo?: string };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ADJUNTO_BYTES = 25 * 1024 * 1024;

function esImagen(a: Adjunto): boolean {
  if (a.tipo?.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(a.nombre);
}

function esPdf(a: Adjunto): boolean {
  if (a.tipo === "application/pdf") return true;
  return /\.pdf$/i.test(a.nombre);
}

export function ProductoMediaUpload({
  productoId,
  imagenPath,
  adjuntos: adjuntosIniciales,
}: {
  productoId: string;
  imagenPath: string | null;
  adjuntos: Adjunto[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado local para reorder optimista. Se sincroniza con props al refrescar.
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>(adjuntosIniciales);

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen supera el tamaño máximo permitido (10MB)");
      e.target.value = "";
      return;
    }
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await setImagenAction(productoId, fd);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onAdjunto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ADJUNTO_BYTES) {
      setError("El adjunto supera el tamaño máximo permitido (25MB)");
      e.target.value = "";
      return;
    }
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await addAdjuntoAction(productoId, fd);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(path: string) {
    if (!confirm("¿Eliminar este adjunto?")) return;
    setBusy(true); setError(null);
    try {
      const res = await removeAdjuntoAction(productoId, path);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= adjuntos.length) return;
    const next = [...adjuntos];
    [next[idx], next[target]] = [next[target], next[idx]];
    // Reorder optimista
    setAdjuntos(next);
    setBusy(true); setError(null);
    try {
      const res = await reorderAdjuntosAction(productoId, next.map((a) => a.path));
      if (!res.ok) {
        setError(res.error ?? "Error");
        // Revertir si falla
        setAdjuntos(adjuntos);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onOpen(path: string) {
    try {
      const res = await getAdjuntoUrlAction(productoId, path);
      if (!res.ok || !res.url) {
        setError(res.error ?? "No se pudo obtener el enlace");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="mt-3 space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-status-danger">{error}</div>}

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">Imagen principal</p>
        {imagenPath && (
          <div className="mb-2 overflow-hidden rounded-md border border-gray-200 bg-white">
            <a href={imagenPath.startsWith("http") ? imagenPath : `/api/storage/producto/${imagenPath}`} target="_blank" rel="noopener noreferrer" title="Abrir imagen en pestaña nueva">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagenPath.startsWith("http") ? imagenPath : `/api/storage/producto/${imagenPath}`} alt="Imagen actual del producto" className="block max-h-40 w-full object-contain" />
            </a>
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <ImageIcon className="h-4 w-4" /> {imagenPath ? "Reemplazar imagen" : "Subir imagen"}
          <input type="file" accept="image/*" className="hidden" onChange={onImage} disabled={busy} aria-label="Subir imagen del producto" />
        </label>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">Adjuntos ({adjuntos.length})</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Upload className="h-4 w-4" /> Agregar adjunto
          <input type="file" className="hidden" onChange={onAdjunto} disabled={busy} aria-label="Subir adjunto" />
        </label>
        {adjuntos.length > 0 && (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-100">
            {adjuntos.map((a, i) => (
              <li key={a.path} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label={`Subir ${a.nombre}`}
                    className="text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === adjuntos.length - 1 || busy}
                    aria-label={`Bajar ${a.nombre}`}
                    className="text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="inline-flex flex-1 items-center gap-1.5 truncate text-gray-700">
                  {esImagen(a) ? <ImageIcon className="h-3.5 w-3.5 text-blue-500" /> :
                   esPdf(a) ? <Paperclip className="h-3.5 w-3.5 text-red-500" /> :
                   <Paperclip className="h-3.5 w-3.5 text-gray-400" />}
                  {a.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => onOpen(a.path)}
                  aria-label={`Abrir ${a.nombre}`}
                  title="Abrir en pestaña nueva"
                  className="text-gray-400 hover:text-brand-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpen(a.path)}
                  aria-label={`Descargar ${a.nombre}`}
                  title="Descargar"
                  className="text-gray-400 hover:text-brand-primary"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(a.path)}
                  aria-label={`Eliminar ${a.nombre}`}
                  title="Eliminar"
                  className="text-status-danger hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
