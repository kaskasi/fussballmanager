import type { Attributes, Player } from "../types/player.ts";
import { PIPELINE_STAGES, type PipelineStage } from "./growth-heatmap.ts";
import { WEEKLY_SKILL_KEYS } from "./growth-history.ts";

export interface AttributeTrainingCell {
  key: keyof Attributes;
  /** Sum of positive attribute deltas across pipeline players this week. */
  gainSum: number;
}

function isPipelinePlayer(
  player: Player,
  clubId: string,
): player is Player & { squad_status: PipelineStage } {
  return (
    player.club_id === clubId &&
    player.squad_status !== "loaned_out" &&
    PIPELINE_STAGES.includes(player.squad_status as PipelineStage)
  );
}

function baselineForWeek(
  player: Player,
  season: number,
  week: number,
): Attributes | null {
  const key = player.state.week_start_key;
  const baseline = player.state.week_start_attributes;
  if (!baseline || !key || key.season !== season || key.week !== week) {
    return null;
  }
  return baseline;
}

/** One cell per skill — team sum of gains since week start (positive only). */
export function squadAttributeTrainingHeatmap(
  players: readonly Player[],
  clubId: string,
  season: number,
  week: number,
): AttributeTrainingCell[] {
  const sums = Object.fromEntries(
    WEEKLY_SKILL_KEYS.map((key) => [key, 0]),
  ) as Record<keyof Attributes, number>;

  for (const player of players) {
    if (!isPipelinePlayer(player, clubId)) continue;
    const baseline = baselineForWeek(player, season, week);
    if (!baseline) continue;
    for (const key of WEEKLY_SKILL_KEYS) {
      const delta = player.attributes[key] - baseline[key];
      if (delta > 0.000_1) sums[key] += delta;
    }
  }

  return WEEKLY_SKILL_KEYS.map((key) => ({
    key,
    gainSum: sums[key],
  }));
}

export function attributeHeatmapPeak(cells: readonly AttributeTrainingCell[]): number {
  return Math.max(...cells.map((cell) => cell.gainSum), 0.000_1);
}

export function attributeHeatmapTotal(cells: readonly AttributeTrainingCell[]): number {
  return cells.reduce((sum, cell) => sum + cell.gainSum, 0);
}

/** Compact label for heat cells — centi-points (×100) when readable, else one decimal. */
export function formatAttributeHeatDelta(sum: number): string {
  if (sum <= 0.000_1) return "·";
  const centi = Math.round(sum * 100);
  if (centi >= 1) return `+${centi}`;
  const tenth = Math.round(sum * 10) / 10;
  return tenth > 0 ? `+${tenth.toFixed(1)}` : "·";
}

/** Hover / aria — precise team sum. */
export function formatAttributeHeatSumPrecise(sum: number): string {
  if (sum <= 0.000_1) return "0";
  if (sum >= 10) return `+${Math.round(sum)}`;
  return `+${(Math.round(sum * 10) / 10).toFixed(1)}`;
}
