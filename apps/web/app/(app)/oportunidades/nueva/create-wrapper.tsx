"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OportunidadForm } from "@/components/forms/oportunidad-form";
import type { PickerData } from "@/lib/db/picker-data";
import { createOportunidadAction, type NuevaOportunidadFormState } from "./actions";

const INITIAL: NuevaOportunidadFormState = { ok: false };

export function CreateWrapper({ picker, defaultAssignedId }: { picker: PickerData; defaultAssignedId: string | null }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createOportunidadAction, INITIAL);

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/oportunidades/${state.id}`);
      router.refresh();
    }
  }, [state.ok, state.id, router]);

  return (
    <form action={formAction}>
      <OportunidadForm
        mode="create"
        initial={{
          asignado_id: defaultAssignedId,
          estado: "activo",
          moneda: "USD",
        }}
        picker={picker}
        isPending={isPending}
        error={state.error ?? null}
        fieldErrors={state.fieldErrors ?? {}}
        cancelHref="/oportunidades"
      />
    </form>
  );
}
