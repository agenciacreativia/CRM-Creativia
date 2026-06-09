"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OportunidadForm, type OportunidadFormValues } from "@/components/forms/oportunidad-form";
import type { PickerData } from "@/lib/db/picker-data";
import { updateOportunidadAction, type OportunidadFormState } from "./actions";

const INITIAL: OportunidadFormState = { ok: false };

export function EditWrapper({
  id,
  initial,
  picker,
}: {
  id: string;
  initial: Partial<OportunidadFormValues>;
  picker: PickerData;
}) {
  const router = useRouter();
  const action = updateOportunidadAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, INITIAL);

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/oportunidades/${state.id}`);
      router.refresh();
    }
  }, [state.ok, state.id, router]);

  return (
    <form action={formAction}>
      <OportunidadForm
        mode="edit"
        initial={initial}
        picker={picker}
        isPending={isPending}
        error={state.error ?? null}
        fieldErrors={state.fieldErrors ?? {}}
        cancelHref={`/oportunidades/${id}`}
      />
    </form>
  );
}
