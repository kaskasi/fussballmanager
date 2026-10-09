import type { ClubFinances } from "../economy/club-finances.ts";
import {
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  type ClubStadium,
  type StadiumBlock,
} from "./club-stadium.ts";

export interface HomeMatchTicketRow {
  week: number;
  total: number;
}

/** Aggregated home-match ticket lines from ledger + open month. */
export function seasonHomeTicketMatches(
  finances: ClubFinances,
  season: number,
): HomeMatchTicketRow[] {
  const byWeek = new Map<number, number>();
  for (const snapshot of finances.ledger ?? []) {
    if (snapshot.season !== season) continue;
    for (const line of snapshot.lines) {
      if (line.kind !== "matchday_tickets" || line.amount <= 0) continue;
      byWeek.set(line.week, (byWeek.get(line.week) ?? 0) + line.amount);
    }
  }
  for (const line of finances.pending_lines ?? []) {
    if (line.kind !== "matchday_tickets" || line.amount <= 0) continue;
    byWeek.set(line.week, (byWeek.get(line.week) ?? 0) + line.amount);
  }
  return [...byWeek.entries()]
    .map(([week, total]) => ({ week, total }))
    .sort((a, b) => a.week - b.week);
}

export function seasonTicketTotal(finances: ClubFinances, season: number): number {
  return seasonHomeTicketMatches(finances, season).reduce((sum, row) => sum + row.total, 0);
}

/** Block share of ticket pool using current pricing/fill (estimate for past matches). */
export function blockShareOfMatchday(stadium: ClubStadium, block: StadiumBlock): number {
  const total = stadiumMatchdayIncome(stadium);
  if (total <= 0) return 0;
  return stadiumBlockIncome(stadium, block) / total;
}

export function blockTicketRowsForSeason(
  stadium: ClubStadium,
  block: StadiumBlock,
  finances: ClubFinances,
  season: number,
): Array<HomeMatchTicketRow & { blockAmount: number }> {
  const share = blockShareOfMatchday(stadium, block);
  return seasonHomeTicketMatches(finances, season).map((row) => ({
    ...row,
    blockAmount: Math.round(row.total * share),
  }));
}

export function blockSeasonTicketTotal(
  stadium: ClubStadium,
  block: StadiumBlock,
  finances: ClubFinances,
  season: number,
): number {
  return blockTicketRowsForSeason(stadium, block, finances, season).reduce(
    (sum, row) => sum + row.blockAmount,
    0,
  );
}
