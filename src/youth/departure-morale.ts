import type { Player } from "../types/player.ts";
import { pendingInboxItems, type YouthInboxState } from "./decision-inbox.ts";

/** Weekly morale pressure while a departure warning stays unresolved. */
export function applyDepartureMoralePressure(
  players: readonly Player[],
  inbox: YouthInboxState,
): Player[] {
  const pressured = new Set(
    pendingInboxItems(inbox, players)
      .filter((item) => item.kind === "departure_risk")
      .map((item) => item.playerId),
  );
  if (pressured.size === 0) return [...players];

  return players.map((player) => {
    if (!pressured.has(player.id)) return player;
    return {
      ...player,
      state: {
        ...player.state,
        morale: Math.max(0, player.state.morale - 4),
      },
    };
  });
}
