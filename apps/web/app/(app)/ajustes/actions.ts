"use server";

import { revalidatePath } from "next/cache";
import { deleteCuentaGoogle, setMyCalendarSync } from "@/lib/db/google";

export async function disconnectGoogleAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteCuentaGoogle();
    revalidatePath("/ajustes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function setCalendarSyncAction(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await setMyCalendarSync(enabled);
    revalidatePath("/ajustes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
