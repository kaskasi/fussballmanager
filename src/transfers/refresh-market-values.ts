import type { Player } from "../types/player.ts";
import { baseAttributeValue, estimateCa, marketValue } from "./market-value.ts";

/** Recompute stored market_value after growth (PRD 05.1, weekly loop). */
export function refreshPlayerMarketValue(player: Player, season: number): Player {
  const ca = estimateCa(player.attributes, player.position);
  const wage = player.contract?.wage_weekly ?? 0;
  const marketWage = Math.max(1, (baseAttributeValue(ca) * 0.008) / 52);
  const seasonsLeft = player.contract ? Math.max(0, player.contract.until_season - season) : 0;
  const monthsRemaining = seasonsLeft * 12;
  const growthRate =
    player.age < 20 ? Math.min(1, (player.state.recent_growth_26w ?? 0) / 40) : 0;

  return {
    ...player,
    market_value: marketValue({
      ca,
      age: player.age,
      monthsRemaining,
      wage,
      marketWage,
      demandFactor: 1,
      reputationFactor: 1,
      estimatedGrowthRateNormalized: growthRate,
    }),
  };
}

export function refreshAllMarketValues(players: readonly Player[], season: number): Player[] {
  return players.map((player) => refreshPlayerMarketValue(player, season));
}
