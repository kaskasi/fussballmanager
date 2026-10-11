import type { Attributes, Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  heatTone,
  squadGrowthHeatmap,
  type GrowthHeatCell,
  type HeatTone,
} from "../player/growth-heatmap.ts";
import { attributesIn, type SessionGroup } from "../development/weekly-plan.ts";

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

function netGroupGrowth(before: Attributes, after: Attributes, group: SessionGroup): number {
  let total = 0;
  for (const key of attributesIn(group)) {
    total += after[key] - before[key];
  }
  return total;
}

function groupGrowthSoFar(
  player: Player,
  season: number,
  week: number,
  group: SessionGroup,
): number | null {
  const key = player.state.week_start_key;
  const baseline = player.state.week_start_attributes;
  if (!baseline || !key || key.season !== season || key.week !== week) {
    return null;
  }
  return netGroupGrowth(baseline, player.attributes, group);
}

/** Net attribute change this week per PRD 02.3 σ group (week-start baseline). */
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
        const growth = groupGrowthSoFar(player, season, week, group);
        return sum + (growth ?? 0);
      }, 0);
    const rounded = Math.round(totalDelta * 10) / 10;
    return {
      group,
      label: labels[group],
      totalDelta: rounded,
      tone: heatTone(rounded === 0 ? null : rounded),
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
