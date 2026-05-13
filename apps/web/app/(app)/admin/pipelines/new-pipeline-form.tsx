"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { createPipelineAction } from "./actions";

export function NewPipelineForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setSubmitting(true);
    const fd = new FormData(form);
    const res = await createPipelineAction(fd);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    router.refresh();
    if (res.id) router.push(`/admin/pipelines/${res.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">{error}</div>
      )}
      <Field label="Nombre" htmlFor="nombre" required>
        <Input id="nombre" name="nombre" placeholder="ej. Ventas Enterprise" required />
      </Field>
      <Field label="Descripción" htmlFor="descripcion">
        <Textarea id="descripcion" name="descripcion" rows={2} />
      </Field>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creando..." : "Crear pipeline"}
      </Button>
    </form>
  );
}
