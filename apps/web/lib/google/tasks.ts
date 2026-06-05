import "server-only";

const BASE = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";

export type GoogleTask = {
  id: string;
  title: string;
  notes: string | null;
  due: string | null;
  status: string;
};

/** Pending tasks from the default list. Never throws. */
export async function listGoogleTasks(accessToken: string, maxResults = 20): Promise<GoogleTask[]> {
  try {
    const params = new URLSearchParams({ showCompleted: "false", maxResults: String(maxResults) });
    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Tasks list error:", res.status, text.slice(0, 200));
      return [];
    }
    const data = (text ? JSON.parse(text) : {}) as {
      items?: { id: string; title?: string; notes?: string; due?: string; status?: string }[];
    };
    return (data.items ?? []).map((t) => ({
      id: t.id,
      title: t.title ?? "(sin título)",
      notes: t.notes ?? null,
      due: t.due ?? null,
      status: t.status ?? "needsAction",
    }));
  } catch (e) {
    console.error("Tasks list exception:", e);
    return [];
  }
}

/** Create a task. `dueDate` is "YYYY-MM-DD" (Google Tasks ignore the time). */
export async function createGoogleTask(
  accessToken: string,
  opts: { title: string; notes?: string; dueDate?: string | null },
): Promise<void> {
  const body: Record<string, unknown> = { title: opts.title };
  if (opts.notes) body.notes = opts.notes;
  if (opts.dueDate) body.due = new Date(`${opts.dueDate}T00:00:00Z`).toISOString();
  const res = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Tasks rechazó la tarea: ${await res.text()}`);
}

/** Mark a task as completed. */
export async function completeGoogleTask(accessToken: string, taskId: string): Promise<void> {
  const res = await fetch(`${BASE}/${taskId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  if (!res.ok) throw new Error(`No se pudo completar: ${await res.text()}`);
}
