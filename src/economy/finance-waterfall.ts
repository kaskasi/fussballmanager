import {
  buildWeeklyFinanceLines,
  type ClubFinances,
  type WeeklyFinanceContext,
} from "./club-finances.ts";
import {
  aggregateFinanceLines,
  financeMonthForWeek,
  financeMonthSnapshot,
  monthNetTotal,
  type FinanceLine,
  type FinanceMonthSnapshot,
} from "./finance-ledger.ts";

export type FinanceWaterfallSource = "pending" | "closed" | "last_closed" | "week_preview";

export interface FinanceWaterfallView {
  month: number;
  title: string;
  caption: string | null;
  source: FinanceWaterfallSource;
  snapshot: FinanceMonthSnapshot;
  streams: FinanceLine[];
  net: number;
}

const SPARKLINE_MONTHS = 13;

export function lastClosedFinanceSnapshot(
  finances: ClubFinances,
  season: number,
): FinanceMonthSnapshot | null {
  const closed =
    finances.ledger
      ?.filter((entry) => entry.season === season && entry.lines.length > 0)
      .slice()
      .sort((left, right) => right.month - left.month) ?? [];
  return closed[0] ?? null;
}

function viewFromSnapshot(
  snapshot: FinanceMonthSnapshot,
  source: FinanceWaterfallSource,
  caption: string | null,
): FinanceWaterfallView {
  return {
    month: snapshot.month,
    title: source === "week_preview" ? "Diese Woche" : `Monat ${snapshot.month}`,
    caption,
    source,
    snapshot,
    streams: aggregateFinanceLines(snapshot.lines),
    net: monthNetTotal(snapshot.lines),
  };
}

function previewSnapshot(
  finances: ClubFinances,
  season: number,
  week: number,
  weekPreview: readonly FinanceLine[],
): FinanceMonthSnapshot {
  const lines = weekPreview.filter((line) => line.amount !== 0);
  const net = monthNetTotal(lines);
  return {
    month: financeMonthForWeek(week),
    season,
    opening_cash: finances.cash,
    closing_cash: finances.cash + net,
    lines,
  };
}

/** Live waterfall: booked month, last close, or this week's streams as furniture. */
export function resolveFinanceWaterfall(
  finances: ClubFinances,
  season: number,
  week: number,
  weekPreview: readonly FinanceLine[] = [],
): FinanceWaterfallView {
  const month = financeMonthForWeek(week);
  const live = financeMonthSnapshot(finances, season, week);
  if (live && live.lines.length > 0) {
    const closedThisMonth = finances.ledger?.some(
      (entry) => entry.season === season && entry.month === month,
    );
    return viewFromSnapshot(
      live,
      closedThisMonth ? "closed" : "pending",
      closedThisMonth ? null : "laufender Monat",
    );
  }
  const last = lastClosedFinanceSnapshot(finances, season);
  if (last) {
    return viewFromSnapshot(last, "last_closed", "letzter Monatsabschluss");
  }
  return viewFromSnapshot(
    previewSnapshot(finances, season, week, weekPreview),
    "week_preview",
    "Buchung mit Wochenabschluss",
  );
}

/** Always 13 points so Woche 1 still has furniture (flat is allowed). */
export function seasonCashSparkline13(
  finances: ClubFinances,
  season: number,
  week: number,
): number[] {
  const byMonth = new Map<number, number>();
  for (const entry of finances.ledger ?? []) {
    if (entry.season !== season) continue;
    byMonth.set(entry.month, entry.closing_cash);
  }
  const currentMonth = financeMonthForWeek(week);
  if ((finances.pending_lines ?? []).length > 0 || !byMonth.has(currentMonth)) {
    byMonth.set(currentMonth, finances.cash);
  }
  const points: number[] = [];
  let last = finances.month_opening_cash ?? finances.cash;
  for (let month = 1; month <= SPARKLINE_MONTHS; month += 1) {
    const booked = byMonth.get(month);
    if (booked != null && month <= currentMonth) {
      last = booked;
    }
    points.push(last);
  }
  return points;
}

export function weekPreviewFinanceLines(context: WeeklyFinanceContext): FinanceLine[] {
  return buildWeeklyFinanceLines(context);
}
