import { loadAgendaRange } from "@/lib/db/agenda";
import { getSessionUser } from "@/lib/auth";
import { AgendaView } from "./agenda-view";

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

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-xs text-gray-500 mt-1">
            Calendario de actividades programadas
          </p>
        </div>
      </header>

      <AgendaView
        year={year}
        month={month}
        events={events}
        scope={scope}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
