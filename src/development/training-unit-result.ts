import type { Attributes, Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { TrainingUnit } from "./training-units.ts";

export type TrainingHighlightMetric = keyof Attributes | "fitness";

export interface TrainingUnitHighlight {
  playerId: string;
  playerName: string;
  metric: TrainingHighlightMetric;
  delta: number;
}

/** Stored on the session after a training NEXT step completes a slot. */
export interface TrainingSlotOutcome {
  slotIndex: number;
  unitId: string;
  highlight: TrainingUnitHighlight | null;
  gains: TrainingUnitHighlight[];
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
  if (unit.fitnessRecoveryFraction !== undefined) {
    let best: TrainingUnitHighlight | null = null;
    let bestDelta = 0;
    for (const player of before) {
      const updated = after.find((entry) => entry.id === player.id);
      if (!updated) continue;
      const delta = updated.state.fitness - player.state.fitness;
      if (delta <= 0 || delta <= bestDelta) continue;
      bestDelta = delta;
      best = {
        playerId: player.id,
        playerName: formatPlayerName(player),
        metric: "fitness",
        delta,
      };
    }
    return best;
  }

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
          metric: key,
          delta,
        };
      }
    }
  }
  return best;
}

/** All positive skill gains from one unit, best first (for slot card / modal). */
export function collectTrainingUnitGains(
  before: readonly Player[],
  after: readonly Player[],
  unit: TrainingUnit,
  limit = 24,
): TrainingUnitHighlight[] {
  const rows: TrainingUnitHighlight[] = [];
  for (const player of before) {
    const updated = after.find((entry) => entry.id === player.id);
    if (!updated) continue;
    if (unit.fitnessRecoveryFraction !== undefined) {
      const delta = updated.state.fitness - player.state.fitness;
      if (delta <= 0) continue;
      rows.push({
        playerId: player.id,
        playerName: formatPlayerName(player),
        metric: "fitness",
        delta,
      });
      continue;
    }
    for (const key of unit.skills) {
      const delta = updated.attributes[key] - player.attributes[key];
      if (delta <= 0.000_1) continue;
      rows.push({
        playerId: player.id,
        playerName: formatPlayerName(player),
        metric: key,
        delta,
      });
    }
  }
  rows.sort((left, right) => {
    const byDelta = right.delta - left.delta;
    if (byDelta !== 0) return byDelta;
    const leftPlayer = before.find((p) => p.id === left.playerId);
    const rightPlayer = before.find((p) => p.id === right.playerId);
    const bySquad =
      squadPriority(rightPlayer?.squad_status ?? "loaned_out") -
      squadPriority(leftPlayer?.squad_status ?? "loaned_out");
    if (bySquad !== 0) return bySquad;
    return left.playerName.localeCompare(right.playerName, "de");
  });
  return rows.slice(0, limit);
}

export function trainingSlotOutcomeAt(
  outcomes: readonly (TrainingSlotOutcome | null)[] | undefined,
  slotIndex: number,
): TrainingSlotOutcome | null {
  return outcomes?.[slotIndex] ?? null;
}

export function formatTrainingDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1);
}
