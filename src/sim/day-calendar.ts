import type { GameSession } from "../persistence/game-session.ts";
import { isLeagueMatchWeek } from "./game-calendar.ts";

export const MONDAY = 1;
export const SATURDAY = 6;
export const SUNDAY = 7;

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export type SmartSkipAction = "advance" | "inbox" | "match" | "simulate_week";

export interface SmartSkipTarget {
  weekday: number;
  action: SmartSkipAction;
  daysAdvanced: number;
}

export function weekdayLabel(weekday: number): string {
  const index = Math.max(0, Math.min(6, weekday - 1));
  return WEEKDAY_LABELS[index] ?? "?";
}

export function isMatchSaturday(week: number): boolean {
  return isLeagueMatchWeek(week);
}

export function resolveSmartSkip(
  session: GameSession,
  hasPendingInbox: boolean,
): SmartSkipTarget {
  const { week, weekday, matchPlayedThisWeek } = session;
  const matchWeek = isMatchSaturday(week);

  if (hasPendingInbox && weekday === MONDAY) {
    return { weekday: MONDAY, action: "inbox", daysAdvanced: 0 };
  }

  if (weekday >= SUNDAY) {
    return { weekday: SUNDAY, action: "simulate_week", daysAdvanced: 0 };
  }

  if (matchWeek && !matchPlayedThisWeek && weekday === SATURDAY) {
    return { weekday: SATURDAY, action: "match", daysAdvanced: 0 };
  }

  if (weekday < SATURDAY) {
    return { weekday: weekday + 1, action: "advance", daysAdvanced: 1 };
  }

  // Saturday after match, or non-match Saturday → step to Sunday
  return { weekday: SUNDAY, action: "advance", daysAdvanced: 1 };
}
