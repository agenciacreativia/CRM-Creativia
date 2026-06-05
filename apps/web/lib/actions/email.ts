"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMyAccessToken } from "@/lib/db/google";
import { getSessionUser } from "@/lib/auth";
import { sendGmail } from "@/lib/google/gmail";
import { createActividad, logCambio } from "@/lib/db/mutations";
import { getOportunidad } from "@/lib/db/oportunidades";
import { getContacto } from "@/lib/db/contactos";
import { getEmpresa } from "@/lib/db/empresas";
import { listCampos } from "@/lib/db/campos";
import { loadDocumentoAttachment } from "@/lib/db/documentos";
import { applyMerge, buildMergeVars } from "@/lib/email/merge";
import { registrarCorreoEnviado, aplicarTracking } from "@/lib/db/correo-tracking";
import type { EmailAttachment } from "@/lib/google/gmail";

export type SendEmailResult = { ok: boolean; error?: string; needsConnect?: boolean };

/** Resolve {{merge tags}} in subject + body against the opportunity's data. */
async function mergeForOportunidad(id: string, subject: string, html: string) {
  try {
    const opp = await getOportunidad(id);
    if (!opp) return { subject, html };
    const [contacto, empresa, campos] = await Promise.all([
      getContacto(opp.contacto_id),
      getEmpresa(opp.empresa_id),
      listCampos("oportunidad"),
    ]);
    const { vars } = buildMergeVars({ opp, contacto, empresa, campos });
    return { subject: applyMerge(subject, vars, false), html: applyMerge(html, vars, true) };
  } catch {
    return { subject, html };
  }
}

const schema = z.object({
  oportunidad_id: z.string().uuid(),
  to: z.string().trim().email("Email destino inválido"),
  subject: z.string().trim().min(1, "Asunto requerido").max(300),
  body: z.string().trim().min(1, "El mensaje no puede estar vacío").max(100000),
  adjuntos: z.string().optional().default(""),
});

export async function sendOportunidadEmailAction(formData: FormData): Promise<SendEmailResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { oportunidad_id, to, subject, body, adjuntos } = parsed.data;

  const user = await getSessionUser();
  const accessToken = await getMyAccessToken();
  if (!accessToken) {
    return { ok: false, needsConnect: true, error: "Conectá tu Gmail en Ajustes para enviar correos." };
  }

  const merged = await mergeForOportunidad(oportunidad_id, subject, body);

  // Load selected document attachments (ids comma-separated).
  const ids = (adjuntos ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const attachments: EmailAttachment[] = [];
  for (const id of ids.slice(0, 10)) {
    const att = await loadDocumentoAttachment(id);
    if (att) attachments.push(att);
  }

  // Tracking: registrar antes de enviar, así inyectamos pixel + redirect de clicks.
  const track = await registrarCorreoEnviado({
    oportunidadId: oportunidad_id,
    contactoId: null,
    asunto: merged.subject,
    destinatario: to,
  });
  const htmlFinal = track ? aplicarTracking(merged.html, track.pixelUrl, track.clickRedirectBase) : merged.html;

  try {
    await sendGmail(accessToken, {
      to,
      subject: merged.subject,
      html: htmlFinal,
      replyTo: user?.email,
      attachments,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar el correo" };
  }

  // Record it as a completed email activity + history entry (best-effort).
  try {
    await createActividad({
      oportunidad_id,
      tipo: "email",
      descripcion: `Para ${to} · ${merged.subject}`,
      fecha_programada: null,
      completada: true,
    });
    await logCambio("oportunidad", oportunidad_id, `Envió un correo a ${to}: ${merged.subject}`);
  } catch {
    /* the email was sent — don't fail the action over logging */
  }

  revalidatePath(`/oportunidades/${oportunidad_id}`);
  return { ok: true };
}
