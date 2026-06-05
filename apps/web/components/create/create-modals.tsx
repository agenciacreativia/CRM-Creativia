"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { PickerData } from "@/lib/db/picker-data";
import { CreateEmpresaModal } from "./create-empresa-modal";
import { CreateContactoModal } from "./create-contacto-modal";
import { CreateOportunidadModal } from "./create-oportunidad-modal";

export type CreateEntity = "empresa" | "contacto" | "oportunidad" | null;

export function CreateModals({
  entity,
  onClose,
  currentUserId,
  rol,
}: {
  entity: CreateEntity;
  onClose: () => void;
  currentUserId: string;
  rol: "admin" | "asesor" | null;
}) {
  const [picker, setPicker] = useState<PickerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load fresh reference data each time a modal opens; clear it on close so a
  // record created in one modal shows up in the next.
  useEffect(() => {
    if (!entity) {
      setPicker(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setPicker(null);
    setError(null);
    fetch("/api/picker")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar"))))
      .then((data: PickerData) => !cancelled && setPicker(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [entity]);

  if (!entity) return null;

  if (error) {
    return (
      <Modal title="Crear" onClose={onClose}>
        <p className="text-sm text-status-danger">No se pudieron cargar los datos: {error}</p>
      </Modal>
    );
  }

  if (!picker) {
    return (
      <Modal title="Cargando…" onClose={onClose}>
        <p className="py-6 text-center text-sm text-gray-500">Cargando datos…</p>
      </Modal>
    );
  }

  if (entity === "empresa") {
    return (
      <CreateEmpresaModal
        usuarios={picker.usuarios}
        campos={picker.campos.filter((c) => c.tipo_entidad === "empresa")}
        onClose={onClose}
      />
    );
  }
  if (entity === "contacto") {
    return (
      <CreateContactoModal
        empresas={picker.empresas}
        usuarios={picker.usuarios}
        campos={picker.campos.filter((c) => c.tipo_entidad === "contacto")}
        onClose={onClose}
      />
    );
  }
  return (
    <CreateOportunidadModal
      picker={picker}
      campos={picker.campos.filter((c) => c.tipo_entidad === "oportunidad")}
      defaultAssignedId={rol === "asesor" ? currentUserId : null}
      onClose={onClose}
    />
  );
}
