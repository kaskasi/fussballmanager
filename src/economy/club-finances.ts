import type { LeagueState } from "../persistence/league-state.ts";
import { leagueTable, topScorers } from "../sim/league-week.ts";
import { stadiumMatchdayIncome, type ClubStadium } from "../stadium/club-stadium.ts";
import { weekCommerceOccupancy } from "../stadium/matchday-commerce.ts";
import { weeklyMerchandisingEconomics } from "./merchandising.ts";
import { weeklyPrecinctConcessionsCash } from "../stadium/precinct-effects.ts";
import {
  seasonSponsorBonusPayouts,
  SPONSOR_BONUS_PAYOUT,
  weeklySponsorInventoryIncome,
} from "../stadium/sponsor-deals.ts";
import { DIVISION_ECONOMY, type DivisionEconomyId } from "./division-economy.ts";
import {
  appendPendingFinanceLines,
  closeFinanceMonth,
  isFinanceMonthStart,
  shouldCloseFinanceMonth,
  type FinanceLine,
  type FinanceLineKind,
  type FinanceMonthSnapshot,
} from "./finance-ledger.ts";
import type { CoachingStaff } from "../staff/coaching-staff.ts";
import { weeklyStaffWageBill } from "../staff/coaching-staff.ts";
import type { Player } from "../types/player.ts";

export interface ClubFinances {
  cash: number;
  transfer_budget: number;
  wage_budget_weekly: number;
  last_closed_month: number;
  ledger?: FinanceMonthSnapshot[];
  pending_lines?: FinanceLine[];
  month_opening_cash?: number;
}

export interface WeeklyFinanceContext {
  players: readonly Player[];
  clubId: string;
  divisionId: DivisionEconomyId;
  isHomeMatchWeek: boolean;
  season: number;
  week: number;
  stadium?: ClubStadium;
  coachingStaff?: CoachingStaff;
  scoutWagesWeekly?: number;
  campUpkeepWeekly?: number;
  hospitalityIncome?: number;
  overtimeCost?: number;
  commerceOccupancy?: number;
  /** Set after advanceMerchandisingWeek in pipeline (stock already sold). */
  merchandisingNet?: number;
}

export interface WeeklyFinanceResult {
  finances: ClubFinances;
  lines: FinanceLine[];
}

/** Playtest 2026-10-09: more room for first-window squad moves. */
export const STARTING_CLUB_CASH = 5_500_000;
export const STARTING_TRANSFER_BUDGET = 2_200_000;
export const STARTING_WAGE_BUDGET_WEEKLY = 85_000;
/** @deprecated Use division economy sponsorship_weekly */
export const WEEKLY_SPONSORSHIP = 55_000;

const TRANSFER_POOL_SHARE = 0.5;

export function divisionEconomy(divisionId: DivisionEconomyId) {
  return DIVISION_ECONOMY[divisionId];
}

export function defaultClubFinances(): ClubFinances {
  return normalizeFinances({
    cash: STARTING_CLUB_CASH,
    transfer_budget: STARTING_TRANSFER_BUDGET,
    wage_budget_weekly: STARTING_WAGE_BUDGET_WEEKLY,
    last_closed_month: 0,
    ledger: [],
    pending_lines: [],
    month_opening_cash: STARTING_CLUB_CASH,
  });
}

export function normalizeFinances(finances: ClubFinances): ClubFinances {
  const transfer_budget = Math.min(finances.transfer_budget, finances.cash);
  return {
    ...finances,
    transfer_budget: Math.max(0, transfer_budget),
    ledger: finances.ledger ?? [],
    pending_lines: finances.pending_lines ?? [],
  };
}

export function weeklyWageBill(players: readonly Player[], clubId: string): number {
  return players
    .filter((player) => player.club_id === clubId && player.squad_status !== "loaned_out")
    .reduce((sum, player) => sum + (player.contract?.wage_weekly ?? 0), 0);
}

export function wageBudgetHeadroom(
  finances: ClubFinances,
  players: readonly Player[],
  clubId: string,
): number {
  return finances.wage_budget_weekly - weeklyWageBill(players, clubId);
}

export type WageBudgetStatus = "good" | "warn" | "over";

export function wageBudgetStatus(
  finances: ClubFinances,
  players: readonly Player[],
  clubId: string,
): WageBudgetStatus {
  const bill = weeklyWageBill(players, clubId);
  if (bill > finances.wage_budget_weekly) return "over";
  if (bill >= finances.wage_budget_weekly * 0.9) return "warn";
  return "good";
}

export function matchdayTicketIncome(
  divisionId: DivisionEconomyId,
  isHomeMatch: boolean,
  stadium?: ClubStadium,
  season?: number,
  week?: number,
): number {
  if (!isHomeMatch) return 0;
  if (stadium) return stadiumMatchdayIncome(stadium, season, week);
  const defaults = divisionEconomy(divisionId).stadium_defaults;
  return Math.round(defaults.capacity * defaults.fill_rate * defaults.avg_ticket_eur);
}

function applyCashLine(finances: ClubFinances, line: FinanceLine): ClubFinances {
  return {
    ...finances,
    cash: finances.cash + line.amount,
  };
}

function applyTransferPoolIncome(finances: ClubFinances, amount: number): ClubFinances {
  const boost = Math.round(amount * TRANSFER_POOL_SHARE);
  return normalizeFinances({
    ...finances,
    transfer_budget: finances.transfer_budget + boost,
  });
}

export function applyFinanceLines(
  finances: ClubFinances,
  lines: readonly FinanceLine[],
): ClubFinances {
  let next = finances;
  for (const line of lines) {
    next = applyCashLine(next, line);
    if (
      line.amount > 0 &&
      (line.kind === "league_prize" || line.kind === "tv_bonus" || line.kind === "player_sale")
    ) {
      next = applyTransferPoolIncome(next, line.amount);
    }
  }
  return normalizeFinances(next);
}

export function buildWeeklyFinanceLines(context: WeeklyFinanceContext): FinanceLine[] {
  const economy = divisionEconomy(context.divisionId);
  const week = context.week;
  const boardIncome = weeklySponsorInventoryIncome(context.stadium?.sponsor_deals, context.season);
  const lines: FinanceLine[] = [
    { kind: "sponsorship", amount: economy.sponsorship_weekly + boardIncome, week },
    { kind: "tv_rights", amount: economy.tv_weekly, week },
    { kind: "player_wages", amount: -weeklyWageBill(context.players, context.clubId), week },
    {
      kind: "staff_wages",
      amount: -(
        (context.coachingStaff
          ? weeklyStaffWageBill(context.coachingStaff)
          : economy.staff_wages_weekly) +
        (context.scoutWagesWeekly ?? 0) +
        (context.campUpkeepWeekly ?? 0)
      ),
      week,
    },
    { kind: "facility_maintenance", amount: -economy.maintenance_weekly, week },
  ];
  const tickets = matchdayTicketIncome(
    context.divisionId,
    context.isHomeMatchWeek,
    context.stadium,
    context.season,
    context.week,
  );
  if (tickets > 0) {
    lines.push({ kind: "matchday_tickets", amount: tickets, week });
  }
  const occupancy =
    context.commerceOccupancy ?? weekCommerceOccupancy(context.isHomeMatchWeek, context.stadium);
  const fanbase = context.stadium?.fanbase;
  const concessions =
    weeklyPrecinctConcessionsCash(
      context.stadium?.precinct,
      occupancy,
      fanbase,
      context.isHomeMatchWeek,
    ) + (context.hospitalityIncome ?? 0);
  if (concessions > 0) {
    lines.push({ kind: "concessions", amount: concessions, week });
  }
  const merchNet =
    context.merchandisingNet ??
    weeklyMerchandisingEconomics({
      stadium: context.stadium,
      players: context.players,
      clubId: context.clubId,
      occupancy,
      isHomeMatchWeek: context.isHomeMatchWeek,
      week: context.week,
      season: context.season,
    }).net;
  if (merchNet > 0) {
    lines.push({ kind: "merchandising", amount: merchNet, week });
  }
  if ((context.overtimeCost ?? 0) > 0) {
    lines.push({ kind: "other", amount: -context.overtimeCost!, week });
  }
  return lines;
}

export function advanceWeeklyClubFinances(
  finances: ClubFinances,
  context: WeeklyFinanceContext,
): WeeklyFinanceResult {
  let next = finances;
  if (isFinanceMonthStart(context.week)) {
    next = { ...next, month_opening_cash: next.cash };
  }
  const lines = buildWeeklyFinanceLines(context);
  next = applyFinanceLines(next, lines);
  next = appendPendingFinanceLines(next, lines);
  if (shouldCloseFinanceMonth(context.week)) {
    next = closeFinanceMonth(next, context.season, context.week);
  }
  return { finances: normalizeFinances(next), lines };
}

export function leagueTablePlace(league: LeagueState): number {
  const index = leagueTable(league).findIndex((row) => row.teamId === league.player_club_id);
  return index >= 0 ? index + 1 : league.club_ids.length;
}

export function applySeasonEndFinances(
  finances: ClubFinances,
  league: LeagueState,
  endingSeason: number,
  week: number,
  stadium?: ClubStadium,
): ClubFinances {
  if (!league.season_complete) return finances;
  const place = leagueTablePlace(league);
  const economy = divisionEconomy(league.division_id as DivisionEconomyId);
  const prize = economy.prize_by_place[place] ?? 0;
  const tvBonus = economy.tv_season_bonus[place] ?? 0;
  const lines: FinanceLine[] = [];
  if (prize > 0) {
    lines.push({ kind: "league_prize", amount: prize, week });
  }
  if (tvBonus > 0) {
    lines.push({ kind: "tv_bonus", amount: tvBonus, week });
  }
  const top = topScorers(league, 1)[0];
  const clubWonTopScorer = Boolean(top && top.goals > 0 && top.teamId === league.player_club_id);
  lines.push(
    ...seasonSponsorBonusPayouts(
      stadium?.sponsor_deals,
      endingSeason,
      place === 1,
      clubWonTopScorer,
    ).map(() => ({
      kind: "other" as const,
      amount: SPONSOR_BONUS_PAYOUT,
      week,
    })),
  );
  if (lines.length === 0) return finances;
  let next = applyFinanceLines(finances, lines);
  next = appendPendingFinanceLines(next, lines);
  if (shouldCloseFinanceMonth(week)) {
    next = closeFinanceMonth(next, endingSeason, week);
  }
  return normalizeFinances(next);
}

export function transferBudget(finances: ClubFinances): number {
  return Math.max(0, finances.transfer_budget);
}

export function canAffordTransfer(finances: ClubFinances, fee: number): boolean {
  return transferBudget(finances) >= fee;
}

export function applyPlayerSaleIncome(finances: ClubFinances, fee: number, week?: number): ClubFinances {
  const line: FinanceLine = { kind: "player_sale", amount: fee, week: week ?? 0 };
  let next = applyFinanceLines(finances, [line]);
  if (week !== undefined) {
    next = appendPendingFinanceLines(next, [line]);
  }
  return next;
}

export function applyTransferFee(finances: ClubFinances, fee: number, week?: number): ClubFinances {
  const line: FinanceLine = { kind: "transfer_fee", amount: -fee, week: week ?? 0 };
  let next = normalizeFinances({
    ...finances,
    transfer_budget: finances.transfer_budget - fee,
  });
  next = applyFinanceLines(next, [line]);
  if (week !== undefined) {
    next = appendPendingFinanceLines(next, [line]);
  }
  return next;
}

/** Capital spend: cash down and a pending ledger line (PRD 11). */
export function spendClubCash(
  finances: ClubFinances,
  amount: number,
  week: number,
  kind: FinanceLineKind = "infrastructure",
): ClubFinances {
  if (!Number.isFinite(amount) || amount <= 0) return finances;
  const line: FinanceLine = { kind, amount: -amount, week };
  let next = applyFinanceLines(finances, [line]);
  next = appendPendingFinanceLines(next, [line]);
  return next;
}

/** Reverse capital spend — e.g. demolished Gelände refund (PRD 14.7). */
export function creditClubCash(
  finances: ClubFinances,
  amount: number,
  week: number,
  kind: FinanceLineKind = "infrastructure",
): ClubFinances {
  if (!Number.isFinite(amount) || amount <= 0) return finances;
  const line: FinanceLine = { kind, amount, week };
  let next = applyFinanceLines(finances, [line]);
  next = appendPendingFinanceLines(next, [line]);
  return next;
}

export function formatClubCash(amount: number): string {
  if (!Number.isFinite(amount)) return "€ 0";
  if (amount < 0) return formatSignedCash(amount);
  if (amount >= 1_000_000) return `€ ${(amount / 1_000_000).toFixed(2)} Mio.`;
  if (amount >= 1_000) return `€ ${Math.round(amount / 1_000)}k`;
  return `€ ${amount}`;
}

/** Weekly wage / upkeep — same magnitude rules as formatClubCash. */
export function formatClubCashWeekly(amount: number): string {
  return `${formatClubCash(amount)}/Wo`;
}

export function formatSignedCash(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  const value = Math.abs(amount);
  if (value >= 1_000_000) return `${sign}€ ${(value / 1_000_000).toFixed(2)} Mio.`;
  if (value >= 1_000) return `${sign}€ ${Math.round(value / 1_000)}k`;
  return `${sign}€ ${value}`;
}
