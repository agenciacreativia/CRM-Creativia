"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { OportunidadForm } from "@/components/forms/oportunidad-form";
import { CamposCustomInputs } from "@/components/campos/create-campos-inputs";
import type { PickerData } from "@/lib/db/picker-data";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { createOportunidadAction, type CreateState } from "@/app/(app)/create-actions";

const INITIAL: CreateState = { ok: false };

export function CreateOportunidadModal({
  picker,
  campos,
  defaultAssignedId,
  onClose,
}: {
  picker: PickerData;
  campos: CampoPersonalizado[];
  defaultAssignedId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createOportunidadAction, INITIAL);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal title="Nueva oportunidad" onClose={onClose} size="max-w-3xl">
      {picker.empresas.length === 0 ? (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-sm">
          Para crear una oportunidad necesitás al menos una empresa con un contacto.{" "}
          <Link href="/admin/datos/importar" className="text-brand-primary hover:underline" onClick={onClose}>
            Importar →
          </Link>
        </div>
      ) : (
        <form action={formAction}>
          <OportunidadForm
            mode="create"
            initial={{ asignado_id: defaultAssignedId, estado: "activo", moneda: "USD" }}
            picker={picker}
            isPending={isPending}
            error={state.error ?? null}
            fieldErrors={state.fieldErrors ?? {}}
            cancelHref="/oportunidades"
            extraFields={<CamposCustomInputs campos={campos} />}
          />
        </form>
      )}
    </Modal>
  );
}
