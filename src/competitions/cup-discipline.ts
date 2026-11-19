/**
 * PRD 36 slice 2 — cup discipline for AI players (PRD 34 keys `regional` /
 * `national`): every club that played a tie serves one cup ban match; cards
 * come only from the manager's watched tie (quick-simmed ties have no player
 * stats and issue no bans, as in the quick-sim leagues).
 */
import type { PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import { applyMatchCards, serveBanMatch } from "../discipline/suspensions.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import type { Player } from "../types/player.ts";
import type { PlayedCupTie } from "./cup-season.ts";

export function applyRivalCupWeek(
  rivalPlayers: readonly Player[],
  played: readonly PlayedCupTie[],
  watchedFixtureStats: readonly PlayerSeasonStat[],
  ownTeamId: TeamId,
): Player[] {
  if (played.length === 0) return [...rivalPlayers];
  const cupOfClub = new Map<string, string>();
  for (const entry of played) {
    cupOfClub.set(careerTeamId(entry.tie.home), entry.cup);
    cupOfClub.set(careerTeamId(entry.tie.away), entry.cup);
  }
  const cards = new Map(
    watchedFixtureStats
      .filter((row) => row.teamId !== ownTeamId)
      .map((row) => [String(row.playerId), row] as const),
  );
  return rivalPlayers.map((rival) => {
    const cup = rival.club_id ? cupOfClub.get(rival.club_id) : undefined;
    if (!cup) return rival;
    const served = serveBanMatch(rival, cup);
    const row = cards.get(rival.id);
    return row ? applyMatchCards(served, row, cup).player : served;
  });
}
