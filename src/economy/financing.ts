import type { DivisionEconomyId } from "./division-economy.ts";
import { divisionEconomy } from "./club-finances.ts";
import { tierOf } from "../sim/league-pyramid.ts";
import { appendPendingFinanceLines, type FinanceLine } from "./finance-ledger.ts";
import { applyFinanceLines, type ClubFinances } from "./club-finances.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import { RELEGATION_ZONE_PLACE } from "../narrative/season-objectives.ts";
import { t } from "../i18n/index.ts";

export interface BankLoan {
  principal: number;
  remaining: number;
  apr_weekly: number;
  weekly_payment: number;
  drawn_season: number;
  drawn_week: number;
}

export type FinancingChannelStatus = "offered" | "accepted" | "declined" | "expired";

export interface FinancingCareerState {
  story_offers_shown: number;
  channel_status: Record<string, FinancingChannelStatus>;
  active_bank_loan?: BankLoan;
  active_shark_loan?: BankLoan;
  bank_cooldown_until_week?: number;
  /** F6.8 — consecutive weeks with negative cash while crisis active. */
  crisis_weeks_negative?: number;
  financial_crisis_active?: boolean;
}

export const MAX_STORY_FINANCING_OFFERS = 3;
export const BANK_COOLDOWN_WEEKS = 8;
export const MIN_BANK_LOAN = 100_000;
export const DEFAULT_BANK_TERM_WEEKS = 52;
export const BANK_APR_WEEKLY = 0.0012;
export const SHARK_APR_WEEKLY = 0.03;
export const SHARK_TERM_WEEKS = 26;
/** Hard ceiling — infrastructure bridge only, not FM-scale mega credit (PRD 11.12.4). */
export const ABS_MAX_BANK_PRINCIPAL = 2_000_000;
/** Per-division caps ≈ one satellite camp down-payment or 2–3 precinct plates. */
export const CAP_BY_DIVISION: Partial<Record<DivisionEconomyId, number>> = {
  "regionalliga-nord": 950_000,
  "oberliga-nord": 650_000,
};

/** Tier fallback when league division is not in `CAP_BY_DIVISION` yet. */
export function loanCapForDivision(divisionId: DivisionEconomyId): number {
  const explicit = CAP_BY_DIVISION[divisionId];
  if (explicit !== undefined) return explicit;
  const tier = tierOf(divisionId);
  if (tier <= 3) return ABS_MAX_BANK_PRINCIPAL;
  if (tier === 4) return 950_000;
  if (tier === 5) return 650_000;
  return 500_000;
}

const SERVICEABLE_K = 0.12;

export function defaultFinancingState(): FinancingCareerState {
  return {
    story_offers_shown: 0,
    channel_status: {},
  };
}

export function normalizeFinancingState(state?: FinancingCareerState): FinancingCareerState {
  if (!state) return defaultFinancingState();
  return {
    story_offers_shown: state.story_offers_shown ?? 0,
    channel_status: { ...(state.channel_status ?? {}) },
    active_bank_loan: state.active_bank_loan,
    active_shark_loan: state.active_shark_loan,
    bank_cooldown_until_week: state.bank_cooldown_until_week,
    crisis_weeks_negative: state.crisis_weeks_negative ?? 0,
    financial_crisis_active: state.financial_crisis_active ?? false,
  };
}

export function financingChannelClosed(state: FinancingCareerState, channelId: string): boolean {
  const status = state.channel_status[channelId];
  return status === "accepted" || status === "declined" || status === "expired";
}

export function canEnqueueStoryFinancingOffer(state: FinancingCareerState): boolean {
  return state.story_offers_shown < MAX_STORY_FINANCING_OFFERS;
}

export interface BankEligibilityInput {
  finances: ClubFinances;
  wageBillWeekly: number;
  runwayWeeks: number | null;
  leaguePlace: number;
  leagueSize: number;
  boardPressure: number;
  divisionId: DivisionEconomyId;
  financing: FinancingCareerState;
  season: number;
  week: number;
}

export interface BankEligibility {
  allowed: boolean;
  max_principal: number;
  apr_weekly: number;
  term_weeks: number;
  reason?: string;
}

export function projectedSeasonRevenue(divisionId: DivisionEconomyId): number {
  const economy = divisionEconomy(divisionId);
  const ticketHeuristic = economy.stadium_defaults.capacity * economy.stadium_defaults.fill_rate * economy.stadium_defaults.avg_ticket_eur * 17;
  return (economy.sponsorship_weekly + economy.tv_weekly) * 52 + ticketHeuristic;
}

export function evaluateBankLoan(input: BankEligibilityInput): BankEligibility {
  const term_weeks = DEFAULT_BANK_TERM_WEEKS;
  const apr_weekly = BANK_APR_WEEKLY;
  if (input.financing.active_bank_loan) {
    return { allowed: false, max_principal: 0, apr_weekly, term_weeks, reason: t("finance.bank.activeLoan") };
  }
  const careerWeek = careerWeekIndex(input.season, input.week);
  if (
    input.financing.bank_cooldown_until_week !== undefined &&
    careerWeek < input.financing.bank_cooldown_until_week
  ) {
    return { allowed: false, max_principal: 0, apr_weekly, term_weeks, reason: t("finance.bank.cooldown") };
  }
  const cap = loanCapForDivision(input.divisionId);
  const serviceable = Math.max(
    0,
    projectedSeasonRevenue(input.divisionId) - input.wageBillWeekly * 52,
  );
  const max_principal = Math.min(
    ABS_MAX_BANK_PRINCIPAL,
    cap,
    Math.round(SERVICEABLE_K * serviceable),
  );
  const relegationZone = input.leaguePlace >= RELEGATION_ZONE_PLACE;
  const runway = input.runwayWeeks ?? 0;
  if (runway < 2 && relegationZone && input.boardPressure > 70) {
    return { allowed: false, max_principal, apr_weekly, term_weeks, reason: t("finance.bank.tooRisky") };
  }
  if (max_principal < MIN_BANK_LOAN) {
    return { allowed: false, max_principal, apr_weekly, term_weeks, reason: t("finance.bank.cannotService") };
  }
  return { allowed: true, max_principal, apr_weekly, term_weeks };
}

export function computeWeeklyLoanPayment(principal: number, aprWeekly: number, termWeeks: number): number {
  if (termWeeks <= 0) return principal;
  const avgInterest = principal * aprWeekly * 0.5;
  return Math.ceil(principal / termWeeks + avgInterest);
}

export function drawBankLoan(
  finances: ClubFinances,
  financing: FinancingCareerState,
  amount: number,
  eligibility: BankEligibility,
  season: number,
  week: number,
): { finances: ClubFinances; financing: FinancingCareerState; lines: FinanceLine[] } | null {
  if (!eligibility.allowed || amount < MIN_BANK_LOAN || amount > eligibility.max_principal) {
    return null;
  }
  const weekly_payment = computeWeeklyLoanPayment(amount, eligibility.apr_weekly, eligibility.term_weeks);
  const loan: BankLoan = {
    principal: amount,
    remaining: amount,
    apr_weekly: eligibility.apr_weekly,
    weekly_payment,
    drawn_season: season,
    drawn_week: week,
  };
  const drawLine: FinanceLine = { kind: "loan_draw", amount, week };
  let nextFinances = applyFinanceLines(finances, [drawLine]);
  nextFinances = appendPendingFinanceLines(nextFinances, [drawLine]);
  return {
    finances: nextFinances,
    financing: { ...financing, active_bank_loan: loan },
    lines: [drawLine],
  };
}

function advanceOneLoan(
  finances: ClubFinances,
  loan: BankLoan,
  week: number,
): { finances: ClubFinances; loan: BankLoan | undefined; lines: FinanceLine[] } {
  if (loan.remaining <= 0) {
    return { finances, loan: undefined, lines: [] };
  }
  const interest = Math.round(loan.remaining * loan.apr_weekly);
  const principalPart = Math.min(
    loan.remaining,
    Math.max(0, loan.weekly_payment - interest),
  );
  const lines: FinanceLine[] = [];
  if (interest > 0) {
    lines.push({ kind: "loan_interest", amount: -interest, week });
  }
  if (principalPart > 0) {
    lines.push({ kind: "loan_repayment", amount: -principalPart, week });
  }
  let nextFinances = finances;
  for (const line of lines) {
    nextFinances = applyFinanceLines(nextFinances, [line]);
    nextFinances = appendPendingFinanceLines(nextFinances, [line]);
  }
  const remaining = Math.max(0, loan.remaining - principalPart);
  if (remaining <= 0) {
    return { finances: nextFinances, loan: undefined, lines };
  }
  return {
    finances: nextFinances,
    loan: { ...loan, remaining },
    lines,
  };
}

export function advanceWeeklyLoanServicing(
  finances: ClubFinances,
  financing: FinancingCareerState,
  season: number,
  week: number,
): { finances: ClubFinances; financing: FinancingCareerState; lines: FinanceLine[] } {
  let nextFinances = finances;
  let nextFinancing = financing;
  const allLines: FinanceLine[] = [];

  if (financing.active_bank_loan) {
    const step = advanceOneLoan(nextFinances, financing.active_bank_loan, week);
    nextFinances = step.finances;
    allLines.push(...step.lines);
    nextFinancing = { ...nextFinancing, active_bank_loan: step.loan };
    if (!step.loan) {
      nextFinancing = {
        ...nextFinancing,
        bank_cooldown_until_week: careerWeekIndex(season, week) + BANK_COOLDOWN_WEEKS,
      };
    }
  }

  if (financing.active_shark_loan) {
    const step = advanceOneLoan(nextFinances, financing.active_shark_loan, week);
    nextFinances = step.finances;
    allLines.push(...step.lines);
    nextFinancing = { ...nextFinancing, active_shark_loan: step.loan };
  }

  return { finances: nextFinances, financing: nextFinancing, lines: allLines };
}
