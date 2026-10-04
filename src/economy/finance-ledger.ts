import type { ClubFinances } from "./club-finances.ts";

export type FinanceLineKind =
  | "sponsorship"
  | "tv_rights"
  | "matchday_tickets"
  | "league_prize"
  | "tv_bonus"
  | "player_sale"
  | "player_wages"
  | "staff_wages"
  | "facility_maintenance"
  | "transfer_fee"
  | "concessions"
  | "infrastructure"
  | "other";

export interface FinanceLine {
  kind: FinanceLineKind;
  /** Positive = income, negative = expense. */
  amount: number;
  week: number;
}

export interface FinanceMonthSnapshot {
  month: number;
  season: number;
  opening_cash: number;
  closing_cash: number;
  lines: FinanceLine[];
}

const MAX_LEDGER = 26;

export function financeMonthForWeek(week: number): number {
  return Math.min(13, Math.max(1, Math.ceil(week / 4)));
}

export function shouldCloseFinanceMonth(week: number): boolean {
  return week > 0 && week % 4 === 0;
}

export function isFinanceMonthStart(week: number): boolean {
  return week === 1 || (week - 1) % 4 === 0;
}

export function financeLineLabel(kind: FinanceLineKind): string {
  switch (kind) {
    case "sponsorship":
      return "Sponsoring";
    case "tv_rights":
      return "TV";
    case "matchday_tickets":
      return "Eintritt";
    case "league_prize":
      return "Saisonprämie";
    case "tv_bonus":
      return "TV-Bonus";
    case "player_sale":
      return "Verkauf";
    case "player_wages":
      return "Gehälter";
    case "staff_wages":
      return "Personal";
    case "facility_maintenance":
      return "Unterhalt";
    case "transfer_fee":
      return "Ablöse";
    case "concessions":
      return "Imbiss & Shop";
    case "infrastructure":
      return "Ausbau";
    default:
      return "Sonstiges";
  }
}

export function financeLineIcon(kind: FinanceLineKind): string {
  switch (kind) {
    case "sponsorship":
      return "🤝";
    case "tv_rights":
    case "tv_bonus":
      return "📺";
    case "matchday_tickets":
      return "🎟️";
    case "league_prize":
      return "🏆";
    case "player_sale":
      return "💰";
    case "player_wages":
      return "👕";
    case "staff_wages":
      return "🧑‍💼";
    case "facility_maintenance":
      return "🏟️";
    case "transfer_fee":
      return "↔️";
    case "concessions":
      return "🌭";
    case "infrastructure":
      return "🏗️";
    default:
      return "•";
  }
}

export function aggregateFinanceLines(lines: readonly FinanceLine[]): FinanceLine[] {
  const totals = new Map<FinanceLineKind, number>();
  for (const line of lines) {
    totals.set(line.kind, (totals.get(line.kind) ?? 0) + line.amount);
  }
  return [...totals.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([kind, amount]) => ({ kind, amount, week: 0 }))
    .sort((left, right) => {
      const leftIn = left.amount >= 0;
      const rightIn = right.amount >= 0;
      if (leftIn !== rightIn) return leftIn ? -1 : 1;
      return leftIn ? right.amount - left.amount : left.amount - right.amount;
    });
}

export function monthNetTotal(lines: readonly FinanceLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

export function appendPendingFinanceLines(
  finances: ClubFinances,
  lines: readonly FinanceLine[],
): ClubFinances {
  if (lines.length === 0) return finances;
  return {
    ...finances,
    pending_lines: [...(finances.pending_lines ?? []), ...lines],
  };
}

export function closeFinanceMonth(
  finances: ClubFinances,
  season: number,
  week: number,
): ClubFinances {
  const month = financeMonthForWeek(week);
  const pending = finances.pending_lines ?? [];
  if (pending.length === 0 && finances.last_closed_month >= month) {
    return finances;
  }
  const snapshot: FinanceMonthSnapshot = {
    month,
    season,
    opening_cash: finances.month_opening_cash ?? finances.cash,
    closing_cash: finances.cash,
    lines: pending,
  };
  const ledger = [...(finances.ledger ?? []), snapshot].slice(-MAX_LEDGER);
  return {
    ...finances,
    ledger,
    pending_lines: [],
    last_closed_month: month,
    month_opening_cash: finances.cash,
  };
}

export function financeMonthSnapshot(
  finances: ClubFinances,
  season: number,
  week: number,
): FinanceMonthSnapshot | null {
  const month = financeMonthForWeek(week);
  const closed = finances.ledger?.find((entry) => entry.season === season && entry.month === month);
  if (closed) return closed;
  const pending = finances.pending_lines ?? [];
  if (pending.length === 0) return null;
  return {
    month,
    season,
    opening_cash: finances.month_opening_cash ?? finances.cash,
    closing_cash: finances.cash,
    lines: pending,
  };
}

export function seasonCashSparkline(finances: ClubFinances, season: number): number[] {
  const points =
    finances.ledger
      ?.filter((entry) => entry.season === season)
      .sort((left, right) => left.month - right.month)
      .map((entry) => entry.closing_cash) ?? [];
  if (points.length === 0) {
    return [finances.cash];
  }
  if ((finances.pending_lines ?? []).length > 0) {
    points.push(finances.cash);
  }
  return points;
}
