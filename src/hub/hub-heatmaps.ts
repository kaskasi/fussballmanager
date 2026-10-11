import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  heatTone,
  squadGrowthHeatmap,
  type GrowthHeatCell,
  type HeatTone,
} from "../player/growth-heatmap.ts";
import { weeklyGrowthSoFar } from "../player/growth-history.ts";

export interface HubAttributeRollup {
  group: "technical" | "physical" | "mental";
  label: string;
  totalDelta: number;
  tone: HeatTone;
}

export interface HubFitnessCell {
  playerId: string;
  initials: string;
  fitness: number;
  tone: HeatTone;
}

function isProPlayer(player: Player, clubId: string): boolean {
  return player.club_id === clubId && player.squad_status === "pro";
}

function fitnessTone(fitness: number): HeatTone {
  if (fitness >= 85) return "up";
  if (fitness >= 65) return "flat";
  return "down";
}

/** Sum of weekly growth so far per training group (display rollup, not a new sim formula). */
export function hubAttributeRollup(
  players: readonly Player[],
  clubId: string,
  season: number,
  week: number,
): HubAttributeRollup[] {
  const groups: HubAttributeRollup["group"][] = ["technical", "physical", "mental"];
  const labels: Record<HubAttributeRollup["group"], string> = {
    technical: "Technik",
    physical: "Athletik",
    mental: "Mental",
  };
  return groups.map((group) => {
    const totalDelta = players
      .filter((player) => isProPlayer(player, clubId))
      .reduce((sum, player) => {
        const growth = weeklyGrowthSoFar(player, season, week);
        return sum + (growth ?? 0);
      }, 0);
    const scaled = totalDelta / 3;
    return {
      group,
      label: labels[group],
      totalDelta: Math.round(scaled * 10) / 10,
      tone: heatTone(scaled === 0 ? null : scaled),
    };
  });
}

export function hubFitnessCells(players: readonly Player[], clubId: string): HubFitnessCell[] {
  return players
    .filter((player) => isProPlayer(player, clubId))
    .map((player) => {
      const fitness = Math.round(player.state.fitness);
      return {
        playerId: player.id,
        initials: formatPlayerName(player).slice(0, 2).toUpperCase(),
        fitness,
        tone: fitnessTone(fitness),
      };
    })
    .sort((a, b) => a.fitness - b.fitness);
}

export function hubPlayerGrowthCells(
  players: readonly Player[],
  clubId: string,
  season: number,
  week: number,
): GrowthHeatCell[] {
  return squadGrowthHeatmap(players, clubId, "weekSoFar", { season, week });
}
