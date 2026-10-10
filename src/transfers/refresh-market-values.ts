import type { Player } from "../types/player.ts";
import { estimateCa, marketValue, marketValueInputFromPlayer } from "./market-value.ts";

/** Recompute stored market_value after growth (PRD 05.1, weekly loop). */
export function refreshPlayerMarketValue(player: Player, season: number): Player {
  const ca = estimateCa(player.attributes, player.position);
  return {
    ...player,
    market_value: marketValue(marketValueInputFromPlayer(player, ca, season)),
  };
}

export function refreshAllMarketValues(players: readonly Player[], season: number): Player[] {
  return players.map((player) => refreshPlayerMarketValue(player, season));
}
