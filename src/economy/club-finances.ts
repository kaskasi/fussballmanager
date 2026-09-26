import type { Player } from "../types/player.ts";

/** Mini club cash until PRD 11 — one pool for wages and transfers. */
export interface ClubFinances {
  cash: number;
}

export const STARTING_CLUB_CASH = 6_000_000;
export const WEEKLY_SPONSORSHIP = 55_000;

export function defaultClubFinances(): ClubFinances {
  return { cash: STARTING_CLUB_CASH };
}

export function weeklyWageBill(players: readonly Player[], clubId: string): number {
  return players
    .filter((player) => player.club_id === clubId && player.squad_status !== "loaned_out")
    .reduce((sum, player) => sum + (player.contract?.wage_weekly ?? 0), 0);
}

export function advanceWeeklyClubFinances(
  finances: ClubFinances,
  players: readonly Player[],
  clubId: string,
): ClubFinances {
  const wages = weeklyWageBill(players, clubId);
  return {
    cash: finances.cash + WEEKLY_SPONSORSHIP - wages,
  };
}

export function transferBudget(finances: ClubFinances): number {
  return Math.max(0, finances.cash);
}

export function canAffordTransfer(finances: ClubFinances, fee: number): boolean {
  return transferBudget(finances) >= fee;
}

export function applyTransferFee(finances: ClubFinances, fee: number): ClubFinances {
  return {
    cash: finances.cash - fee,
  };
}

export function formatClubCash(amount: number): string {
  const value = Math.max(0, amount);
  if (value >= 1_000_000) return `€ ${(value / 1_000_000).toFixed(2)} Mio.`;
  if (value >= 1_000) return `€ ${Math.round(value / 1_000)}k`;
  return `€ ${value}`;
}
