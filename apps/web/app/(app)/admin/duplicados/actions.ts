"use server";

import { revalidatePath } from "next/cache";
import { mergeContactos, mergeEmpresas } from "@/lib/db/duplicados";

type Result = { ok: boolean; error?: string };

export async function mergeContactosAction(primaryId: string, dupId: string): Promise<Result> {
  try {
    await mergeContactos(primaryId, dupId);
    revalidatePath("/admin/duplicados");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function mergeEmpresasAction(primaryId: string, dupId: string): Promise<Result> {
  try {
    await mergeEmpresas(primaryId, dupId);
    revalidatePath("/admin/duplicados");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
