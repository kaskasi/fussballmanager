import type { PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import { recordAppearanceGoals } from "../development/ability-stamps.ts";
import { applyMatchCards, serveBanMatch } from "../discipline/suspensions.ts";
import type { Player } from "../types/player.ts";

interface StatDelta {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

/**
 * Apply engine matchday rows to rival career players (foreign + opponent clubs).
 * Every division plays the same matchday, so every open ban is served first (PRD 34).
 */
export function applyRivalMatchdayStats(
  rivalPlayers: readonly Player[],
  matchdayStats: readonly PlayerSeasonStat[],
  playerClubEngineId: TeamId,
): Player[] {
  const byId = new Map(rivalPlayers.map((player) => [player.id, player]));
  const deltas = new Map<string, StatDelta>();

  for (const row of matchdayStats) {
    if (row.teamId === playerClubEngineId) continue;
    const playerId = String(row.playerId);
    const player = byId.get(playerId);
    if (!player) continue;
    const acc = deltas.get(playerId) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    acc.goals += row.goals;
    acc.assists += row.assists;
    acc.yellowCards += row.yellowCards;
    acc.redCards += row.redCards ?? 0;
    deltas.set(playerId, acc);
  }

  return rivalPlayers.map((rival) => {
    const player = serveBanMatch(rival);
    const delta = deltas.get(player.id);
    if (!delta) return player;
    const goals = delta.goals;
    const next = applyMatchCards(
      {
        ...player,
        state: {
          ...player.state,
          season_goals: player.state.season_goals + goals,
          season_assists: player.state.season_assists + delta.assists,
          season_yellow_cards: (player.state.season_yellow_cards ?? 0) + delta.yellowCards,
        },
      },
      delta,
    ).player;
    return goals > 0 ? recordAppearanceGoals(next, goals) : next;
  });
}
