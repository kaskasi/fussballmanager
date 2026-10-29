import { rollsRetirement, type RetirementContext } from "../development/retirement.ts";
import { retiresAtSeasonEnd } from "../development/own-retirement.ts";
import { retiredRecord, type RetiredPlayer } from "../development/retired-players.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import type { TransferState } from "../transfers/negotiations.ts";
import type { Player } from "../types/player.ts";
import { careerTeamId } from "./rival-growth.ts";

/** PRD 31 §3 — AI retirement at season end and the clean-up it needs. */

export interface AiRetirementStep {
  rivalPlayers: Player[];
  retired: RetiredPlayer[];
}

/** Players with an agreed move (pre-contract, purchase, scheduled deal) see it through first. */
export function playersInAgreedDeals(state: TransferState): Set<string> {
  return new Set([
    ...(state.pending_transfers ?? []).map((entry) => entry.player_id),
    ...(state.pending_purchases ?? []).map((entry) => entry.player_id),
    ...(state.scheduled_transfers ?? []).map((entry) => entry.player_id),
  ]);
}

export function retireAiPlayers(
  rivalPlayers: readonly Player[],
  ctx: RetirementContext,
  exempt: ReadonlySet<string> = new Set(),
): AiRetirementStep {
  const remaining: Player[] = [];
  const retired: RetiredPlayer[] = [];
  for (const player of rivalPlayers) {
    // A player sold after announcing retirement keeps to it.
    const retires = retiresAtSeasonEnd(player, ctx.endingSeason) || rollsRetirement(player, ctx);
    if (!exempt.has(player.id) && retires) {
      retired.push(retiredRecord(player, ctx.endingSeason));
    } else {
      remaining.push(player);
    }
  }
  return { rivalPlayers: remaining, retired };
}

/** Club id (`cl_…`) → division id for the season that just ended. */
export function clubDivisionLookup(league: LeagueState): (clubId: string) => string | null {
  const byClub = new Map<string, string>();
  for (const [divisionId, teamIds] of Object.entries(league.league_pools ?? {})) {
    for (const teamId of teamIds ?? []) byClub.set(careerTeamId(teamId), divisionId);
  }
  return (clubId) => byClub.get(clubId) ?? null;
}

/** Drop every market, negotiation and shortlist entry that names a retired player. */
export function pruneRetiredFromTransferState(
  state: TransferState,
  retiredIds: ReadonlySet<string>,
): TransferState {
  if (retiredIds.size === 0) return state;
  const keep = <T extends { player_id: string }>(entries: readonly T[] | undefined) =>
    entries?.filter((entry) => !retiredIds.has(entry.player_id));
  return {
    ...state,
    shortlist: state.shortlist.filter((id) => !retiredIds.has(id)),
    offers: keep(state.offers) ?? [],
    negotiations: keep(state.negotiations),
    pending_transfers: keep(state.pending_transfers),
    pending_purchases: keep(state.pending_purchases),
    inbound_offers: keep(state.inbound_offers),
    listings: keep(state.listings),
    scheduled_transfers: keep(state.scheduled_transfers),
    opening_market_player_ids: state.opening_market_player_ids?.filter((id) => !retiredIds.has(id)),
  };
}
