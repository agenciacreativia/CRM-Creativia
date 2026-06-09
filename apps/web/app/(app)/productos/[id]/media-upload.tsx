"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { setImagenAction, addAdjuntoAction, removeAdjuntoAction } from "./actions";

type Adjunto = { path: string; nombre: string; tipo?: string };

export function ProductoMediaUpload({
  productoId,
  imagenPath,
  adjuntos,
}: {
  productoId: string;
  imagenPath: string | null;
  adjuntos: Adjunto[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limites de tamano: 10MB para imagenes, 25MB para adjuntos generales
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const MAX_ADJUNTO_BYTES = 25 * 1024 * 1024;

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen supera el tamano maximo permitido (10MB)");
      e.target.value = "";
      return;
    }
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await setImagenAction(productoId, fd);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  async function onAdjunto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ADJUNTO_BYTES) {
      setError("El adjunto supera el tamano maximo permitido (25MB)");
      e.target.value = "";
      return;
    }
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await addAdjuntoAction(productoId, fd);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  async function onRemove(path: string) {
    if (!confirm("¿Eliminar este adjunto?")) return;
    setBusy(true);
    const res = await removeAdjuntoAction(productoId, path);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  return (
    <div className="mt-3 space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-status-danger">{error}</div>}

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">Imagen principal</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <ImageIcon className="h-4 w-4" /> {imagenPath ? "Reemplazar imagen" : "Subir imagen"}
          <input type="file" accept="image/*" className="hidden" onChange={onImage} disabled={busy} />
        </label>
        {imagenPath && <p className="mt-1 text-xs text-gray-400">Actual: {imagenPath}</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">Adjuntos ({adjuntos.length})</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Upload className="h-4 w-4" /> Agregar adjunto
          <input type="file" className="hidden" onChange={onAdjunto} disabled={busy} />
        </label>
        {adjuntos.length > 0 && (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-100">
            {adjuntos.map((a) => (
              <li key={a.path} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5 truncate text-gray-700">
                  <Paperclip className="h-3.5 w-3.5 text-gray-400" /> {a.nombre}
                </span>
                <button onClick={() => onRemove(a.path)} className="text-status-danger hover:underline">
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
