import type { Player } from "../types/player.ts";
import { lineupFormFromPlayer, lineupWeakFoot } from "./lineup-player-status.ts";

/** F1.1 — weak-foot hint for matchday cards (PRD 09). Form/fitness use LineupFormValue / LineupFatigueBars. */
export function matchPlayerWeakFoot(player: Player) {
  const weak = lineupWeakFoot(player);
  return {
    show: weak.show,
    label: weak.label,
    title: `Schwaches Bein ${player.attributes.weak_foot}`,
  };
}
