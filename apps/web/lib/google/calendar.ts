import "server-only";

const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type NewCalendarEvent = {
  summary: string;
  description?: string;
  /** Local datetime "YYYY-MM-DDTHH:mm[:ss]" interpreted in `timeZone`. */
  startLocal: string;
  endLocal: string;
  timeZone: string;
  attendees?: string[];
  /** Attach a Google Meet video link to the event. */
  addMeet?: boolean;
};

function withSeconds(dt: string): string {
  return dt.length === 16 ? `${dt}:00` : dt;
}

/** Create an event in the user's primary Google Calendar. Returns its links. */
export async function createCalendarEvent(
  accessToken: string,
  ev: NewCalendarEvent,
): Promise<{ htmlLink: string | null; meetLink: string | null }> {
  const body: Record<string, unknown> = {
    summary: ev.summary,
    description: ev.description || undefined,
    start: { dateTime: withSeconds(ev.startLocal), timeZone: ev.timeZone },
    end: { dateTime: withSeconds(ev.endLocal), timeZone: ev.timeZone },
    attendees: ev.attendees?.filter(Boolean).map((email) => ({ email })),
  };
  if (ev.addMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const url = `${CAL}?sendUpdates=all${ev.addMeet ? "&conferenceDataVersion=1" : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Calendar rechazó el evento: ${await res.text()}`);
  const data = (await res.json()) as {
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  };
  const meetLink =
    data.hangoutLink ??
    data.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ??
    null;
  return { htmlLink: data.htmlLink ?? null, meetLink };
}

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
  allDay: boolean;
};

/** Upcoming events from now, ordered by start. Never throws. */
export async function listUpcomingEvents(
  accessToken: string,
  maxResults = 10,
): Promise<CalendarEvent[]> {
  try {
    const params = new URLSearchParams({
      timeMin: new Date().toISOString(),
      maxResults: String(maxResults),
      singleEvents: "true",
      orderBy: "startTime",
    });
    const res = await fetch(`${CAL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Calendar list error:", res.status, text.slice(0, 200));
      return [];
    }
    const data = (text ? JSON.parse(text) : {}) as {
      items?: {
        id: string;
        summary?: string;
        htmlLink?: string;
        eventType?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }[];
    };
    return (data.items ?? [])
      // Drop Google's auto "working location" / out-of-office / focus blocks.
      .filter((e) => !e.eventType || e.eventType === "default")
      .map((e) => ({
        id: e.id,
        summary: e.summary ?? "(sin título)",
        start: e.start?.dateTime ?? e.start?.date ?? null,
        end: e.end?.dateTime ?? e.end?.date ?? null,
        htmlLink: e.htmlLink ?? null,
        allDay: !!e.start?.date && !e.start?.dateTime,
      }));
  } catch (e) {
    console.error("Calendar list exception:", e);
    return [];
  }
}
