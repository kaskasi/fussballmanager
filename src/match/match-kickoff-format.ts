import { SATURDAY } from "../sim/day-calendar.ts";
import { civilDateFromSession } from "../sim/session-civil-date.ts";

/** Standard league Saturday kickoff (display only; sim stays event-driven). */
export const LEAGUE_MATCH_KICKOFF_HOUR = 15;
export const LEAGUE_MATCH_KICKOFF_MINUTE = 30;

export function formatLeagueMatchKickoffLabel(
  season: number,
  seasonWeek: number,
  weekday: number = SATURDAY,
): string {
  const civil = civilDateFromSession(season, seasonWeek, weekday);
  const kickoff = new Date(
    civil.year,
    civil.monthIndex,
    civil.day,
    LEAGUE_MATCH_KICKOFF_HOUR,
    LEAGUE_MATCH_KICKOFF_MINUTE,
  );
  const datePart = kickoff.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = kickoff.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}
