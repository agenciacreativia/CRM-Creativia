import { loadAgendaRange } from "@/lib/db/agenda";
import { getSessionUser } from "@/lib/auth";
import { getMyAccessToken } from "@/lib/db/google";
import { listUpcomingEvents } from "@/lib/google/calendar";
import { listGoogleTasks } from "@/lib/google/tasks";
import { AgendaView } from "./agenda-view";
import { GoogleTasks } from "./google-tasks";
import { PageHeader } from "@/components/ui/page-header";

function fmtEvent(iso: string | null, allDay: boolean): string {
  if (!iso) return "";
  const d = new Date(iso);
  return allDay
    ? d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })
    : d.toLocaleString("es", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type SearchParams = Promise<{ ym?: string; scope?: string }>;

function monthBounds(ym: string): { from: string; to: string; year: number; month: number } {
  const [y, m] = ym.split("-").map((s) => parseInt(s, 10));
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { from: ymd(first), to: ymd(last), year, month };
}

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getSessionUser();

  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = params.ym ?? defaultYm;
  const scope = params.scope === "me" ? "me" : "all";

  const { from, to, year, month } = monthBounds(ym);
  const events = await loadAgendaRange({ from, to, scope });

  const googleToken = await getMyAccessToken();
  const [googleEvents, googleTasks] = googleToken
    ? await Promise.all([listUpcomingEvents(googleToken, 8), listGoogleTasks(googleToken, 15)])
    : [[], []];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        subtitle="Calendario de actividades programadas"
      />

      <AgendaView
        year={year}
        month={month}
        events={events}
        scope={scope}
        currentUserId={user?.id ?? null}
      />

      {googleToken && <GoogleTasks initial={googleTasks} />}

      {googleToken && (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">
            Mi Google Calendar <span className="text-gray-400">· próximos eventos</span>
          </h2>
          {googleEvents.length === 0 ? (
            <p className="text-sm text-gray-500">No tenés eventos próximos.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {googleEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{e.summary}</p>
                    <p className="text-xs text-gray-500">{fmtEvent(e.start, e.allDay)}</p>
                  </div>
                  {e.htmlLink && (
                    <a
                      href={e.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-brand-primary hover:underline"
                    >
                      Abrir
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
