import type { BoardState } from "../board/board-state.ts";
import { appendPendingFinanceLines, type FinanceLine } from "./finance-ledger.ts";
import { applyFinanceLines, type ClubFinances } from "./club-finances.ts";
import type { FinancingCareerState } from "./financing.ts";

export const CRISIS_NEGATIVE_WEEKS_TRIGGER = 3;
export const CRISIS_WEEKLY_LEVY_RATE = 0.012;

export interface FinancialCrisisStep {
  finances: ClubFinances;
  financing: FinancingCareerState;
  board: BoardState;
  lines: FinanceLine[];
}

/** F6.8 — administration levy when cash stays negative (optional shark coupling later). */
export function advanceFinancialCrisisWeek(
  finances: ClubFinances,
  financing: FinancingCareerState,
  board: BoardState,
  week: number,
): FinancialCrisisStep {
  let nextFinances = finances;
  let nextFinancing = financing;
  let nextBoard = board;
  const lines: FinanceLine[] = [];

  if (finances.cash < 0) {
    nextFinancing = {
      ...nextFinancing,
      crisis_weeks_negative: (nextFinancing.crisis_weeks_negative ?? 0) + 1,
    };
  } else if ((nextFinancing.crisis_weeks_negative ?? 0) > 0) {
    nextFinancing = { ...nextFinancing, crisis_weeks_negative: 0, financial_crisis_active: false };
  }

  const weeksNegative = nextFinancing.crisis_weeks_negative ?? 0;
  const sharkStress = Boolean(nextFinancing.active_shark_loan && finances.cash < 0);
  const active =
    nextFinancing.financial_crisis_active ||
    weeksNegative >= CRISIS_NEGATIVE_WEEKS_TRIGGER ||
    sharkStress;

  if (active) {
    nextFinancing = { ...nextFinancing, financial_crisis_active: true };
    const wageProxy = Math.max(50_000, Math.round(Math.abs(finances.cash) * CRISIS_WEEKLY_LEVY_RATE));
    const levy = Math.min(85_000, wageProxy);
    const line: FinanceLine = { kind: "crisis_admin_levy", amount: -levy, week };
    lines.push(line);
    nextFinances = applyFinanceLines(nextFinances, [line]);
    nextFinances = appendPendingFinanceLines(nextFinances, [line]);
    nextBoard = {
      ...nextBoard,
      pressure: Math.min(100, nextBoard.pressure + 3),
    };
  }

  return { finances: nextFinances, financing: nextFinancing, board: nextBoard, lines };
}
