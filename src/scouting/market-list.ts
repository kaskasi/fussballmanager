import { NORDSTERN_ID, SEED_DIVISION } from "@fussballmanager/shared";
import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { generateDemoProSquad } from "../ui/demo-pro-squad.ts";
import { confidenceLabel, type AbilityEstimate } from "./estimate-model.ts";

/**
 * Market targets for Screen 3 (PRD 09.2, F4.1).
 * Senior players from rival league clubs — not youth intake.
 */

export type ConfidenceBucket = "known" | "unclear" | "unknown";

export interface ScoutedTarget {
  player: Player;
  estimate: AbilityEstimate;
}

export interface MarketFilters {
  query: string;
  position: PositionPrimary | "all";
  confidence: ConfidenceBucket | "all";
}

export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  query: "",
  position: "all",
  confidence: "all",
};

export type MarketSortKey =
  | "name"
  | "position"
  | "age"
  | "ca"
  | "marketValue"
  | "seasonMinutes"
  | "goals"
  | "assists"
  | "yellowCards"
  | "tackles"
  | "headers"
  | "avgRating"
  | "form";

export type MarketSortDirection = "asc" | "desc";

export interface MarketSort {
  key: MarketSortKey;
  direction: MarketSortDirection;
}

export const DEFAULT_MARKET_SORT: MarketSort = {
  key: "ca",
  direction: "desc",
};

const RIVAL_REGIONS: Record<string, string> = {
  "tsv-holzweg": "Niedersachsen",
  "union-elbstrand": "Hamburg",
  "vfb-moorsiel": "Schleswig-Holstein",
  "spvgg-kuestenholz": "Schleswig-Holstein",
  "sv-rheinwacht": "Nordrhein-Westfalen",
};

export function confidenceBucket(range: number): ConfidenceBucket {
  if (range >= 40) return "unknown";
  if (range >= 20) return "unclear";
  return "known";
}

export function headlineCounts(targets: readonly ScoutedTarget[]): {
  known: number;
  unclear: number;
  unknown: number;
} {
  let known = 0;
  let unclear = 0;
  let unknown = 0;
  for (const target of targets) {
    const bucket = confidenceBucket(target.estimate.uncertaintyRange);
    if (bucket === "known") known += 1;
    else if (bucket === "unclear") unclear += 1;
    else unknown += 1;
  }
  return { known, unclear, unknown };
}

export function filterMarket(targets: readonly ScoutedTarget[], filters: MarketFilters): ScoutedTarget[] {
  const query = filters.query.trim().toLowerCase();
  return targets.filter((target) => {
    if (filters.position !== "all" && target.player.position !== filters.position) return false;
    if (
      filters.confidence !== "all" &&
      confidenceBucket(target.estimate.uncertaintyRange) !== filters.confidence
    ) {
      return false;
    }
    if (!query) return true;
    return (
      formatPlayerName(target.player).toLowerCase().includes(query) ||
      target.player.position.toLowerCase().includes(query) ||
      target.player.birth.region.toLowerCase().includes(query) ||
      (target.player.club_id ?? "").toLowerCase().includes(query)
    );
  });
}

/** Senior squads from rival league clubs (excludes the player club). */
export function loadMarketList(): ScoutedTarget[] {
  const targets: ScoutedTarget[] = [];
  let slot = 0;
  let idStart = 1_000;

  for (const squad of SEED_DIVISION) {
    if (squad.team.id === NORDSTERN_ID) continue;
    const clubId = careerClubId(squad.team.id);
    const region = RIVAL_REGIONS[squad.team.id] ?? "Deutschland";
    const pros = generateDemoProSquad({
      clubId,
      idStart,
      random: mulberry32(hashTeam(squad.team.id)),
    }).map((player) => ({
      ...player,
      club_id: clubId,
      birth: { ...player.birth, region },
    }));

    for (const player of pros) {
      targets.push({
        player,
        estimate: estimateForSlot(slot),
      });
      slot += 1;
    }
    idStart += 20;
  }

  return targets;
}

function careerClubId(teamId: string): string {
  return `cl_${teamId.replace(/-/g, "_")}`;
}

function hashTeam(teamId: string): number {
  let hash = 0;
  for (const ch of teamId) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return hash >>> 0;
}

function estimateForSlot(index: number): AbilityEstimate {
  const band = index % 10;
  if (band < 4) return { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 };
  if (band < 7) return { estimatedAbilityMean: 72, uncertaintyRange: 28, sampleSize: 1 };
  if (band < 9) return { estimatedAbilityMean: 78, uncertaintyRange: 14, sampleSize: 2 };
  return { estimatedAbilityMean: 84, uncertaintyRange: 6, sampleSize: 4 };
}

export function targetLabel(target: ScoutedTarget): string {
  return confidenceLabel({ status: "scouted", estimate: target.estimate }) ?? "❓";
}

export function barBand(estimate: AbilityEstimate): { value: number; low: number; high: number } {
  const half = estimate.uncertaintyRange / 2;
  return {
    value: estimate.estimatedAbilityMean,
    low: Math.max(0, estimate.estimatedAbilityMean - half),
    high: Math.min(199, estimate.estimatedAbilityMean + half),
  };
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
