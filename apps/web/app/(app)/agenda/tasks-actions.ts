"use server";

import { revalidatePath } from "next/cache";
import { getMyAccessToken } from "@/lib/db/google";
import { createGoogleTask, completeGoogleTask } from "@/lib/google/tasks";

export type TaskResult = { ok: boolean; error?: string; needsConnect?: boolean };

export async function createTaskAction(formData: FormData): Promise<TaskResult> {
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const due = String(formData.get("due") ?? "").trim();
  if (!title) return { ok: false, error: "El título es requerido" };

  const token = await getMyAccessToken();
  if (!token) return { ok: false, needsConnect: true, error: "Conectá tu cuenta de Google en Ajustes." };

  try {
    await createGoogleTask(token, { title, notes: notes || undefined, dueDate: due || null });
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function completeTaskAction(id: string): Promise<TaskResult> {
  const token = await getMyAccessToken();
  if (!token) return { ok: false, needsConnect: true };
  try {
    await completeGoogleTask(token, id);
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
