import type { Attributes, Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { TrainingUnit } from "./training-units.ts";

export interface TrainingUnitHighlight {
  playerId: string;
  playerName: string;
  attribute: keyof Attributes;
  delta: number;
}

function squadPriority(status: Player["squad_status"]): number {
  if (status === "pro") return 3;
  if (status === "u19") return 2;
  if (status === "u17") return 1;
  return 0;
}

/** Best visible gain among unit skills — prefers senior squad minutes. */
export function highlightTrainingUnitResult(
  before: readonly Player[],
  after: readonly Player[],
  unit: TrainingUnit,
): TrainingUnitHighlight | null {
  let best: TrainingUnitHighlight | null = null;
  let bestScore = -Infinity;

  for (const player of before) {
    const updated = after.find((entry) => entry.id === player.id);
    if (!updated) continue;
    for (const key of unit.skills) {
      const delta = updated.attributes[key] - player.attributes[key];
      if (delta <= 0.000_1) continue;
      const score = delta * 100 + squadPriority(player.squad_status);
      if (score > bestScore) {
        bestScore = score;
        best = {
          playerId: player.id,
          playerName: formatPlayerName(player),
          attribute: key,
          delta,
        };
      }
    }
  }
  return best;
}

export function formatTrainingDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1);
}
