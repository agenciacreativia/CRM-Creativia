"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Sede } from "@/lib/db/sedes";
import { createSedeAction, updateSedeAction, deleteSedeAction } from "./sedes-actions";

export function SedesSection({
  empresaId,
  initial,
  canWrite,
}: {
  empresaId: string;
  initial: Sede[];
  canWrite: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("empresa_id", empresaId);
    const res = await createSedeAction(fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    setShowAdd(false);
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta sede?")) return;
    startTransition(async () => {
      const res = await deleteSedeAction(id, empresaId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">
          Sedes <span className="text-gray-400">({initial.length})</span>
        </h2>
        {canWrite && (
          <Button type="button" size="sm" onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}>
            {showAdd ? "Cancelar" : "+ Agregar sede"}
          </Button>
        )}
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger mb-3">{error}</div>
      )}

      {showAdd && canWrite && (
        <form onSubmit={onAdd} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3 mb-4">
          <SedeFields />
          <Button type="submit" size="sm">Guardar sede</Button>
        </form>
      )}

      {initial.length === 0 && !showAdd ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Sin sedes adicionales. {canWrite && "Agregá sucursales o ubicaciones si la empresa tiene varias."}
        </p>
      ) : (
        <ul className="space-y-3">
          {initial.map((s) => (
            <li key={s.id}>
              {editingId === s.id && canWrite ? (
                <EditForm
                  sede={s}
                  empresaId={empresaId}
                  onDone={() => { setEditingId(null); router.refresh(); }}
                  onError={setError}
                />
              ) : (
                <SedeCard
                  sede={s}
                  canWrite={canWrite}
                  onEdit={() => setEditingId(s.id)}
                  onDelete={() => onDelete(s.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SedeCard({
  sede,
  canWrite,
  onEdit,
  onDelete,
}: {
  sede: Sede;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{sede.nombre}</p>
            {sede.es_principal && <Badge variant="info">principal</Badge>}
          </div>
          <dl className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600">
            {sede.direccion && <Row label="Dirección" v={sede.direccion} />}
            {sede.ciudad && <Row label="Ciudad" v={`${sede.ciudad}${sede.pais ? `, ${sede.pais}` : ""}`} />}
            {sede.telefono && <Row label="Teléfono" v={sede.telefono} />}
            {sede.email && <Row label="Email" v={sede.email} />}
          </dl>
        </div>
        {canWrite && (
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="text-status-danger">Eliminar</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-gray-400">{label}:</span>
      <span className="truncate">{v}</span>
    </div>
  );
}

function EditForm({
  sede,
  empresaId,
  onDone,
  onError,
}: {
  sede: Sede;
  empresaId: string;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.append("empresa_id", empresaId);
    const res = await updateSedeAction(sede.id, fd);
    if (!res.ok) onError(res.error);
    else onDone();
  }
  return (
    <form onSubmit={onSubmit} className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
      <SedeFields sede={sede} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">Guardar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

function SedeFields({ sede }: { sede?: Sede }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nombre de la sede" htmlFor="nombre" required>
          <Input id="nombre" name="nombre" defaultValue={sede?.nombre ?? ""} placeholder="ej. Sede Bogotá" required />
        </Field>
        <Field label="Teléfono" htmlFor="telefono">
          <Input id="telefono" name="telefono" defaultValue={sede?.telefono ?? ""} />
        </Field>
      </div>
      <Field label="Dirección" htmlFor="direccion">
        <Input id="direccion" name="direccion" defaultValue={sede?.direccion ?? ""} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Ciudad" htmlFor="ciudad">
          <Input id="ciudad" name="ciudad" defaultValue={sede?.ciudad ?? ""} />
        </Field>
        <Field label="País" htmlFor="pais">
          <Input id="pais" name="pais" defaultValue={sede?.pais ?? ""} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={sede?.email ?? ""} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="es_principal" value="true" defaultChecked={sede?.es_principal} className="rounded" />
        Marcar como sede principal
      </label>
    </>
  );
}
