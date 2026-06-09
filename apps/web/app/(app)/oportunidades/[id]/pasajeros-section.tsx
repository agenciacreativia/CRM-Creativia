"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Trash2, Paperclip, FileText, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Pasajero } from "@/lib/db/pasajeros";
import {
  crearPasajeroAction,
  eliminarPasajeroAction,
  subirArchivoPasajeroAction,
  verArchivoPasajeroAction,
} from "./pasajeros-actions";

const TIPO_LABEL: Record<string, string> = { adulto: "Adulto", nino: "Niño", bebe: "Bebé" };

export function PasajerosSection({
  oportunidadId,
  initial,
  canEdit,
}: {
  oportunidadId: string;
  initial: Pasajero[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // new passenger form
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"adulto" | "nino" | "bebe">("adulto");
  const [documento, setDocumento] = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [docVenc, setDocVenc] = useState("");
  const [saving, setSaving] = useState(false);

  async function agregar() {
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    setSaving(true);
    const res = await crearPasajeroAction({ oportunidadId, nombre, tipo, documento: documento || null, fecha_nacimiento: fechaNac || null, doc_vencimiento: docVenc || null });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    setNombre(""); setDocumento(""); setFechaNac(""); setDocVenc(""); setTipo("adulto"); setAdding(false);
    router.refresh();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este pasajero?")) return;
    const res = await eliminarPasajeroAction(id, oportunidadId);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }

  async function subir(pasajeroId: string, file: File) {
    setError(null);
    setBusy(pasajeroId);
    const fd = new FormData();
    fd.set("pasajeroId", pasajeroId);
    fd.set("oportunidadId", oportunidadId);
    fd.set("archivo", file);
    const res = await subirArchivoPasajeroAction(fd);
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }

  async function ver(pasajeroId: string) {
    const res = await verArchivoPasajeroAction(pasajeroId);
    if (res.ok && res.url) window.open(res.url, "_blank");
    else setError(res.error ?? "Sin archivo");
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
          <Users className="h-4 w-4" /> Pasajeros {initial.length > 0 && <span className="text-gray-400">({initial.length})</span>}
        </h2>
        {canEdit && !adding && (
          <Button type="button" size="sm" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Agregar pasajero
          </Button>
        )}
      </div>

      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {adding && (
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-6">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className="md:col-span-2" />
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as "adulto" | "nino" | "bebe")}>
            <option value="adulto">Adulto</option>
            <option value="nino">Niño</option>
            <option value="bebe">Bebé</option>
          </Select>
          <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Documento" />
          <label className="text-xs text-gray-500">Nacimiento<Input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} /></label>
          <label className="text-xs text-gray-500">Vence doc.<Input type="date" value={docVenc} onChange={(e) => setDocVenc(e.target.value)} /></label>
          <div className="flex items-center gap-2 md:col-span-6">
            <Button type="button" size="sm" onClick={agregar} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setError(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {initial.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">Sin pasajeros. Agregá los datos del cliente y sus acompañantes.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {initial.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {p.nombre} <Badge variant="default">{TIPO_LABEL[p.tipo] ?? p.tipo}</Badge>
                </p>
                <p className="text-xs text-gray-500">
                  {p.documento ? `Doc. ${p.documento}` : "sin documento"}{p.fecha_nacimiento ? ` · ${p.fecha_nacimiento}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.archivo_path ? (
                  <button type="button" onClick={() => ver(p.id)} aria-label={`Ver documento de ${p.nombre}`} className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline" title={p.archivo_nombre ?? "Ver"}>
                    <FileText className="h-3.5 w-3.5" /> Ver doc
                  </button>
                ) : (
                  <span className="text-xs text-gray-300">sin doc</span>
                )}
                {canEdit && (
                  <>
                    <input
                      ref={(el) => { fileRefs.current[p.id] = el; }}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(p.id, f); e.target.value = ""; }}
                    />
                    <button type="button" onClick={() => fileRefs.current[p.id]?.click()} disabled={busy === p.id} aria-label={`Subir documento de ${p.nombre}`} className="text-gray-400 hover:text-brand-primary" title="Subir/cambiar documento">
                      {busy === p.id ? <Upload className="h-4 w-4 animate-pulse" /> : <Paperclip className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => eliminar(p.id)} aria-label={`Eliminar a ${p.nombre}`} className="text-gray-400 hover:text-status-danger" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
