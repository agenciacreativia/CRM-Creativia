"use server";

import { getSessionUser } from "@/lib/auth";
import {
  parseEmpresas,
  parseContactos,
  parseOportunidades,
  type ParsedEmpresa,
  type ParsedContacto,
  type ParsedOportunidad,
} from "@/lib/import/parse";
import { buildPreview, type ImportPreview } from "@/lib/import/preview";
import { commitImport, type CommitResult } from "@/lib/import/commit";

export type ParsedPayload = {
  empresas: ParsedEmpresa[];
  contactos: ParsedContacto[];
  oportunidades: ParsedOportunidad[];
};

async function ensureAdmin() {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  if (user.rol !== "admin") throw new Error("Solo administradores pueden importar datos");
  return user;
}

async function fileToBuffer(file: File | null): Promise<ArrayBuffer | null> {
  if (!file || file.size === 0) return null;
  return await file.arrayBuffer();
}

export async function parseAndPreviewAction(formData: FormData): Promise<{
  ok: true;
  preview: ImportPreview;
  parsed: ParsedPayload;
} | {
  ok: false;
  error: string;
}> {
  try {
    await ensureAdmin();

    const empresasBuf      = await fileToBuffer(formData.get("empresas") as File | null);
    const contactosBuf     = await fileToBuffer(formData.get("contactos") as File | null);
    const oportunidadesBuf = await fileToBuffer(formData.get("oportunidades") as File | null);

    const empresas      = empresasBuf      ? parseEmpresas(empresasBuf)      : [];
    const contactos     = contactosBuf     ? parseContactos(contactosBuf)    : [];
    const oportunidades = oportunidadesBuf ? parseOportunidades(oportunidadesBuf) : [];

    if (empresas.length + contactos.length + oportunidades.length === 0) {
      return { ok: false, error: "No se cargó ningún archivo o están vacíos." };
    }

    const preview = await buildPreview({ empresas, contactos, oportunidades });
    return { ok: true, preview, parsed: { empresas, contactos, oportunidades } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function commitImportAction(
  parsed: ParsedPayload,
): Promise<{ ok: true; result: CommitResult } | { ok: false; error: string }> {
  try {
    await ensureAdmin();
    const result = await commitImport(parsed);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
