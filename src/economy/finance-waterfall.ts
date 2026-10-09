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
  type FinanceLineKind,
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

export type FinanceFlowCategory =
  | "matchday"
  | "operations"
  | "wages"
  | "transfers"
  | "infrastructure"
  | "other";

export const FINANCE_FLOW_META: Record<FinanceFlowCategory, { icon: string; label: string }> = {
  matchday: { icon: "🎟️", label: "Spieltag" },
  operations: { icon: "📺", label: "Betrieb" },
  wages: { icon: "👕", label: "Gehälter" },
  transfers: { icon: "↔️", label: "Transfers" },
  infrastructure: { icon: "🏗️", label: "Ausbau" },
  other: { icon: "•", label: "Sonstiges" },
};

export const FINANCE_FLOW_ORDER: readonly FinanceFlowCategory[] = [
  "matchday",
  "operations",
  "wages",
  "transfers",
  "infrastructure",
  "other",
];

export function financeFlowCategory(kind: FinanceLineKind): FinanceFlowCategory {
  switch (kind) {
    case "matchday_tickets":
    case "concessions":
    case "merchandising":
      return "matchday";
    case "sponsorship":
    case "tv_rights":
    case "tv_bonus":
    case "league_prize":
    case "facility_maintenance":
      return "operations";
    case "player_wages":
    case "staff_wages":
      return "wages";
    case "player_sale":
    case "transfer_fee":
      return "transfers";
    case "infrastructure":
      return "infrastructure";
    default:
      return "other";
  }
}

export interface MonthlyCategoryFlow {
  month: number;
  cash: number;
  matchday: number;
  operations: number;
  wages: number;
  transfers: number;
  infrastructure: number;
  other: number;
}

function emptyCategoryTotals() {
  return {
    matchday: 0,
    operations: 0,
    wages: 0,
    transfers: 0,
    infrastructure: 0,
    other: 0,
  };
}

function addLineToCategories(
  totals: ReturnType<typeof emptyCategoryTotals>,
  line: FinanceLine,
): void {
  const category = financeFlowCategory(line.kind);
  totals[category] += line.amount;
}

export function seasonCategorizedFlows(
  finances: ClubFinances,
  season: number,
  week: number,
): MonthlyCategoryFlow[] {
  const currentMonth = financeMonthForWeek(week);
  const byMonth = new Map<number, ReturnType<typeof emptyCategoryTotals>>();
  const cashByMonth = new Map<number, number>();
  for (const entry of finances.ledger ?? []) {
    if (entry.season !== season) continue;
    const totals = emptyCategoryTotals();
    for (const line of entry.lines) addLineToCategories(totals, line);
    byMonth.set(entry.month, totals);
    cashByMonth.set(entry.month, entry.closing_cash);
  }
  const pending = finances.pending_lines ?? [];
  if (pending.length > 0) {
    const totals = byMonth.get(currentMonth) ?? emptyCategoryTotals();
    for (const line of pending) addLineToCategories(totals, line);
    byMonth.set(currentMonth, totals);
    cashByMonth.set(currentMonth, finances.cash);
  }
  const rows: MonthlyCategoryFlow[] = [];
  let lastCash = finances.month_opening_cash ?? finances.cash;
  for (let month = 1; month <= SPARKLINE_MONTHS; month += 1) {
    const totals = byMonth.get(month) ?? emptyCategoryTotals();
    const cash = cashByMonth.get(month);
    if (cash != null && month <= currentMonth) lastCash = cash;
    rows.push({ month, cash: lastCash, ...totals });
  }
  return rows;
}
