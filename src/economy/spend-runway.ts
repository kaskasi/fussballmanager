import type { BoardState } from "../board/board-state.ts";
import { formatClubCash, formatSignedCash, type ClubFinances } from "./club-finances.ts";
import { t } from "../i18n/index.ts";
import { formatDecimal } from "../i18n/number-display.ts";

export const BIG_SPEND_THRESHOLD = 100_000;

export interface SpendRunway {
  cost: number;
  cashAfter: number;
  weeksAfter: number | null;
  boardFloor: number;
  belowFloor: boolean;
}

export function boardCashFloor(board: BoardState): number {
  return board.objectives.find((objective) => objective.kind === "min_cash")?.target ?? 0;
}

export function weeksOfWages(cash: number, weeklyWageBill: number): number | null {
  if (!(weeklyWageBill > 0)) return null;
  return cash / weeklyWageBill;
}

export function needsSpendConfirm(cost: number, weeklyWageBill: number): boolean {
  if (!(cost > 0)) return false;
  return cost >= BIG_SPEND_THRESHOLD || (weeklyWageBill > 0 && cost >= weeklyWageBill);
}

export function spendRunway(
  finances: ClubFinances,
  weeklyWageBill: number,
  cost: number,
  boardFloor: number,
): SpendRunway {
  const cashAfter = finances.cash - cost;
  return {
    cost,
    cashAfter,
    weeksAfter: weeksOfWages(cashAfter, weeklyWageBill),
    boardFloor,
    belowFloor: cashAfter < boardFloor,
  };
}

export function formatWeeksOfWages(weeks: number | null): string {
  if (weeks === null) return "—";
  if (weeks < 0) return t("spend.weeks", { weeks: 0 });
  if (weeks >= 100) return t("spend.weeks", { weeks: "99+" });
  return t("spend.weeks", { weeks: formatDecimal(weeks, weeks >= 10 ? 0 : 1) });
}

export function spendRunwayLines(runway: SpendRunway): Array<{ label: string; value: string; warn?: boolean }> {
  return [
    { label: t("spend.cost"), value: formatClubCash(runway.cost) },
    {
      label: t("spend.cashAfter"),
      value: formatSignedCash(runway.cashAfter),
      warn: runway.cashAfter < 0,
    },
    { label: t("spend.wages"), value: formatWeeksOfWages(runway.weeksAfter) },
    {
      label: t("spend.boardCash"),
      value: runway.belowFloor
        ? t("spend.belowFloor", { amount: formatClubCash(runway.boardFloor) })
        : formatSignedCash(runway.cashAfter - runway.boardFloor),
      warn: runway.belowFloor,
    },
  ];
}
