import { calendarWeek, isSummerTransferWindow, isWinterTransferWindow } from "../sim/game-calendar.ts";
import { matchdayForWeek, seasonEndWeek } from "../sim/season-schedule.ts";
import { seasonCalendarYear } from "../sim/season-label.ts";
import { transferWindowKind, type TransferWindowKind } from "../sim/transfer-windows.ts";
import { t } from "./index.ts";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function formatCalendarWeekDisplay(seasonWeek: number): string {
  return t("calendar.week", { kw: calendarWeek(seasonWeek) });
}

export function formatSeasonDisplay(season: number): string {
  return t("calendar.season", { year: seasonCalendarYear(season) });
}

export function calendarPhaseDisplay(week: number): string {
  const matchday = matchdayForWeek(week);
  if (matchday != null) {
    return t("calendar.phase.league", { matchday });
  }
  if (week === seasonEndWeek()) return t("calendar.phase.seasonEnd");
  if (isSummerTransferWindow(week)) return t("calendar.phase.summerWindow");
  if (isWinterTransferWindow(week)) return t("calendar.phase.winterWindow");
  return t("calendar.phase.prep");
}

export function transferWindowDisplay(week: number): string {
  const kind = transferWindowKind(week);
  if (kind === "summer") return t("transfer.window.summer");
  if (kind === "winter") return t("transfer.window.winter");
  return t("transfer.window.closed");
}

export function transferWindowAmbienceHint(kind: TransferWindowKind): string {
  return kind === "summer"
    ? t("transfer.ambience.summerOpen")
    : t("transfer.ambience.winterOpen");
}

export function weekdayShortDisplay(weekday: number): string {
  const index = Math.max(0, Math.min(6, weekday - 1));
  return t(`shell.weekday.${WEEKDAY_KEYS[index]}`);
}

export function weekdayStripAriaLabel(seasonWeek: number, weekday: number): string {
  return t("calendar.weekdayStripAria", {
    week: formatCalendarWeekDisplay(seasonWeek),
    day: weekdayShortDisplay(weekday),
  });
}

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

export function monthDisplay(monthIndex: number): string {
  return t(`calendar.month.${MONTH_KEYS[monthIndex] ?? "january"}`);
}

export function monthShortDisplay(monthIndex: number): string {
  return t(`calendar.monthShort.${MONTH_KEYS[monthIndex] ?? "january"}`);
}
