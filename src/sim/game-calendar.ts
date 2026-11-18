/**
 * In-game calendar display and transfer windows (PRD 05, PRD 35).
 * Which week is a match week, pre-season or season end: `season-schedule.ts`.
 * Anzeige-KW: ISO-Kalenderwoche der Saisonwoche.
 */
import {
  advanceSeasonWeek,
  isLeagueWeek,
  isoWeekForWeek,
  isoWeekOfWeekOne,
  matchdayForWeek,
  seasonEndWeek,
  seasonFirstWeek,
  slotKind,
  summerWindowIsoWeeks,
  winterWindowIsoWeeks,
} from "./season-schedule.ts";

export const WEEKS_PER_YEAR = 52;

/** ISO calendar week of season week 1. */
export function seasonStartCalendarWeek(): number {
  return isoWeekOfWeekOne();
}

export function calendarWeek(seasonWeek: number): number {
  return isoWeekForWeek(seasonWeek);
}

export function formatCalendarWeek(seasonWeek: number): string {
  return `KW ${calendarWeek(seasonWeek)}`;
}

export function isSummerTransferWindow(week: number): boolean {
  return summerWindowIsoWeeks().includes(calendarWeek(week));
}

export function isWinterTransferWindow(week: number): boolean {
  return winterWindowIsoWeeks().includes(calendarWeek(week));
}

export function calendarPhaseLabel(week: number): string {
  const matchday = matchdayForWeek(week);
  if (isLeagueWeek(week) && matchday != null) return `Liga · Spieltag ${matchday}`;
  if (week === seasonEndWeek()) return "Saisonende · Intake";
  if (isSummerTransferWindow(week)) return "Sommerfenster";
  if (isWinterTransferWindow(week)) return "Winterfenster";
  switch (slotKind(week)) {
    case "summer_break":
      return "Sommerpause";
    case "winter_break":
      return "Winterpause";
    case "cup":
      return "Freie Woche";
    default:
      return "Vorbereitung";
  }
}

/**
 * First week of the next transfer window strictly after `week` — when a deal agreed outside a window
 * is executed. After the winter window it is the first summer-window week of the next season.
 */
export function nextTransferWindowStart(season: number, week: number): { season: number; week: number } {
  const isWindow = (w: number) => isSummerTransferWindow(w) || isWinterTransferWindow(w);
  for (let next = week + 1; next <= seasonEndWeek(); next += 1) {
    if (isWindow(next)) return { season, week: next };
  }
  for (let next = seasonFirstWeek(season + 1); next <= seasonEndWeek(); next += 1) {
    if (isWindow(next)) return { season: season + 1, week: next };
  }
  return { season: season + 1, week: seasonFirstWeek(season + 1) };
}

/** Advance one calendar week; the football season rolls over after its season-end week. */
export function advanceCalendarWeek(week: number): { nextWeek: number; footballSeasonEnded: boolean } {
  return advanceSeasonWeek(week);
}
