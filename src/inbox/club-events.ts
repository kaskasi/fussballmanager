export type ClubEventKind = "transfer" | "profile" | "finance" | "inbox" | "info";

export interface ClubEvent {
  id: string;
  week: number;
  season: number;
  kind: ClubEventKind;
  message: string;
}

export const MAX_CLUB_EVENTS = 40;

export function emptyClubEvents(): ClubEvent[] {
  return [];
}

export function appendClubEvent(
  events: readonly ClubEvent[],
  event: Omit<ClubEvent, "id"> & { id?: string },
): ClubEvent[] {
  const salt = events.length;
  const entry: ClubEvent = {
    ...event,
    id: event.id ?? `evt_${event.season}_${event.week}_${salt}_${event.kind}`,
  };
  return [entry, ...events].slice(0, MAX_CLUB_EVENTS);
}

export function clubEventIcon(kind: ClubEventKind): string {
  switch (kind) {
    case "transfer":
      return "💰";
    case "profile":
      return "👤";
    case "finance":
      return "💶";
    case "inbox":
      return "📥";
    default:
      return "ℹ️";
  }
}

export function withClubEvent(
  events: readonly ClubEvent[],
  season: number,
  week: number,
  kind: ClubEventKind,
  message: string,
): ClubEvent[] {
  return appendClubEvent(events, { season, week, kind, message });
}
