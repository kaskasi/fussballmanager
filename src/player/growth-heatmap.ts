import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../types/player-display.ts";
import { weeklyGrowthDelta, weeklyGrowthSoFar } from "./growth-history.ts";

/** Pipeline stages on PRD 09 Screen 1 — youth before first team. */
export const PIPELINE_STAGES = ["u17", "u19", "pro"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type HeatTone = "up" | "down" | "flat" | "pending";

export interface PipelineStageFill {
  stage: PipelineStage;
  label: string;
  icon: string;
  count: number;
}

export interface GrowthHeatCell {
  playerId: string;
  initials: string;
  label: string;
  position: PositionPrimary;
  squadStatus: PipelineStage;
  growth: number | null;
  tone: HeatTone;
}

const STAGE_META: Record<PipelineStage, { label: string; icon: string; order: number }> = {
  u17: { label: "U17", icon: "🌱", order: 0 },
  u19: { label: "U19", icon: "🌿", order: 1 },
  pro: { label: "Profi", icon: "⭐", order: 2 },
};

export function pipelineStageLabel(stage: PipelineStage): string {
  return STAGE_META[stage].label;
}

export function heatTone(growth: number | null): HeatTone {
  if (growth === null) return "pending";
  if (growth > 0) return "up";
  if (growth < 0) return "down";
  return "flat";
}

/** Opacity for a pixel relative to the squad's peak |delta| this week. */
export function heatIntensity(growth: number | null, peak: number): number {
  if (growth === null) return 0.35;
  const safePeak = Math.max(peak, 0.01);
  return 0.45 + (Math.abs(growth) / safePeak) * 0.55;
}

export function heatmapPeak(cells: readonly GrowthHeatCell[]): number {
  return Math.max(...cells.map((cell) => Math.abs(cell.growth ?? 0)), 0.01);
}

export function heatCellInitials(player: Pick<Player, "name" | "portrait_seed">): string {
  const name = formatPlayerName(player);
  const last = name.trim().split(/\s+/).at(-1) ?? "?";
  return last.slice(0, 2).toUpperCase();
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

/** Headcount per academy/pro stage — bar heights only, no new growth formula. */
export function pipelineStageFill(
  players: readonly Player[],
  clubId: string,
): PipelineStageFill[] {
  const counts: Record<PipelineStage, number> = { u17: 0, u19: 0, pro: 0 };
  for (const player of players) {
    if (!isPipelinePlayer(player, clubId)) continue;
    counts[player.squad_status] += 1;
  }
  return PIPELINE_STAGES.map((stage) => ({
    stage,
    label: STAGE_META[stage].label,
    icon: STAGE_META[stage].icon,
    count: counts[stage],
  }));
}

/**
 * One cell per owned pipeline player. Tone comes from last week's 02.1 net
 * attribute change (`last_week_growth`) — the heatmap has no own formula.
 */
export type SquadGrowthHeatmapMode = "lastWeek" | "weekSoFar";

export function squadGrowthHeatmap(
  players: readonly Player[],
  clubId: string,
  mode: SquadGrowthHeatmapMode = "lastWeek",
  calendar?: { season: number; week: number },
): GrowthHeatCell[] {
  const growthFor = (player: Player): number | null => {
    if (mode === "weekSoFar" && calendar) {
      return weeklyGrowthSoFar(player, calendar.season, calendar.week);
    }
    return weeklyGrowthDelta(player);
  };

  return players
    .filter((player): player is Player & { squad_status: PipelineStage } =>
      isPipelinePlayer(player, clubId),
    )
    .map((player) => {
      const growth = growthFor(player);
      return {
        playerId: player.id,
        initials: heatCellInitials(player),
        label: formatPlayerName(player),
        position: formatPlayerPositionLabel(player),
        squadStatus: player.squad_status,
        growth,
        tone: heatTone(growth),
      };
    })
    .sort((left, right) => {
      const byStage = STAGE_META[left.squadStatus].order - STAGE_META[right.squadStatus].order;
      if (byStage !== 0) return byStage;
      const leftRank = left.growth ?? Number.NEGATIVE_INFINITY;
      const rightRank = right.growth ?? Number.NEGATIVE_INFINITY;
      if (rightRank !== leftRank) return rightRank - leftRank;
      return left.label.localeCompare(right.label, "de");
    });
}

export function heatmapCellsForStage(
  cells: readonly GrowthHeatCell[],
  stage: PipelineStage,
): GrowthHeatCell[] {
  return cells.filter((cell) => cell.squadStatus === stage);
}

export const WEEKLY_TRAINING_EXTREME_COUNT = 3;

export interface WeeklyTrainingExtremes {
  hasData: boolean;
  best: GrowthHeatCell[];
  worst: GrowthHeatCell[];
}

/**
 * Optional extremes report (three strongest / weakest last-week 02.1 results).
 * The Hub and Training UI use the full team pixel bar; this helper remains for
 * digests. Players in `best` are not repeated in `worst`.
 */
export function weeklyTrainingExtremes(
  players: readonly Player[],
  clubId: string,
  limit = WEEKLY_TRAINING_EXTREME_COUNT,
): WeeklyTrainingExtremes {
  const ranked = squadGrowthHeatmap(players, clubId)
    .filter((cell) => cell.growth !== null)
    .sort((left, right) => {
      const byGrowth = (right.growth ?? 0) - (left.growth ?? 0);
      if (byGrowth !== 0) return byGrowth;
      return left.label.localeCompare(right.label, "de");
    });

  if (ranked.length === 0) {
    return { hasData: false, best: [], worst: [] };
  }

  const best = ranked.slice(0, limit);
  const bestIds = new Set(best.map((cell) => cell.playerId));
  const worst = ranked
    .filter((cell) => !bestIds.has(cell.playerId))
    .sort((left, right) => {
      const byGrowth = (left.growth ?? 0) - (right.growth ?? 0);
      if (byGrowth !== 0) return byGrowth;
      return left.label.localeCompare(right.label, "de");
    })
    .slice(0, limit);

  return { hasData: true, best, worst };
}
