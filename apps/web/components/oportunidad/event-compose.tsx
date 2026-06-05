"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createOportunidadEventoAction } from "@/lib/actions/calendar";

export function EventCompose({
  oportunidadId,
  contactoEmail,
  googleConnected,
}: {
  oportunidadId: string;
  contactoEmail: string;
  googleConnected: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  if (!googleConnected) {
    return (
      <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
        Para agendar reuniones en tu Google Calendar, conectá tu cuenta en{" "}
        <Link href="/ajustes" className="font-medium text-brand-primary hover:underline">Ajustes</Link>.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLink(null);
    setMeetLink(null);
    setSaving(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("oportunidad_id", oportunidadId);
    const res = await createOportunidadEventoAction(fd);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo crear");
      return;
    }
    form.reset();
    setOpen(false);
    setLink(res.link ?? null);
    setMeetLink(res.meetLink ?? null);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mb-4">
        <Button type="button" size="sm" onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" /> Agendar reunión
        </Button>
        {link && (
          <p className="mt-2 text-sm text-[var(--green-tag)]">
            Reunión agendada ✓{" "}
            <a href={link} target="_blank" rel="noopener noreferrer" className="underline">
              ver en Calendar
            </a>
            {meetLink && (
              <>
                {" · "}
                <a href={meetLink} target="_blank" rel="noopener noreferrer" className="underline">
                  unirse a Meet
                </a>
              </>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-5 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <Field label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" placeholder="Ej. Llamada de seguimiento" required />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Inicio" htmlFor="inicio">
          <Input id="inicio" name="inicio" type="datetime-local" required />
        </Field>
        <Field label="Fin" htmlFor="fin">
          <Input id="fin" name="fin" type="datetime-local" required />
        </Field>
      </div>
      <Field label="Descripción" htmlFor="descripcion">
        <Textarea id="descripcion" name="descripcion" rows={2} />
      </Field>
      {contactoEmail && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="invitado" value={contactoEmail} className="rounded" defaultChecked />
          Invitar al contacto ({contactoEmail})
        </label>
      )}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="meet" value="true" className="rounded" defaultChecked />
        Agregar enlace de Google Meet
      </label>
      {error && <p className="text-sm text-status-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving} className="inline-flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" /> {saving ? "Agendando…" : "Agendar en Calendar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
