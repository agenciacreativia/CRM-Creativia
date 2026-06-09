"use server";

import { revalidatePath } from "next/cache";
import { agregarEmpresaSecundaria, quitarEmpresaSecundaria } from "@/lib/db/contacto-empresas";
import { logCambio } from "@/lib/db/mutations";

export async function agregarEmpresaSecundariaAction(
  contactoId: string,
  empresaId: string,
  rol: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await agregarEmpresaSecundaria(contactoId, empresaId, rol?.trim() || null);
    await logCambio("contacto", contactoId, `Vinculó una empresa adicional (${empresaId})`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
  revalidatePath(`/contactos/${contactoId}`);
  return { ok: true };
}

export async function quitarEmpresaSecundariaAction(
  contactoId: string,
  empresaId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await quitarEmpresaSecundaria(contactoId, empresaId);
    await logCambio("contacto", contactoId, `Desvinculó la empresa adicional (${empresaId})`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
  revalidatePath(`/contactos/${contactoId}`);
  return { ok: true };
}
