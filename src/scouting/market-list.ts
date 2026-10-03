import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  worldCareerClubId,
  type WorldClub,
} from "../world/world-generator.ts";
import { confidenceLabel, type AbilityEstimate } from "./estimate-model.ts";

/**
 * Market targets for Screen 3 (PRD 09.2, F4.1).
 * Senior players from rival league clubs — not youth intake.
 */

export type ConfidenceBucket = "known" | "unclear" | "unknown";

export interface ScoutedTarget {
  player: Player;
  estimate: AbilityEstimate;
  clubName?: string;
}

export interface MarketFilters {
  query: string;
  position: PositionPrimary | "all";
  confidence: ConfidenceBucket | "all";
  age: "all" | "u21" | "22-27" | "28+";
}

export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  query: "",
  position: "all",
  confidence: "all",
  age: "all",
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
    if (filters.age === "u21" && target.player.age > 21) return false;
    if (filters.age === "22-27" && (target.player.age < 22 || target.player.age > 27)) return false;
    if (filters.age === "28+" && target.player.age < 28) return false;
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
      (target.clubName ?? "").toLowerCase().includes(query) ||
      (target.player.club_id ?? "").toLowerCase().includes(query)
    );
  });
}

/** Market rows are projections of the persisted rival roster, never copies of seed data. */
export function loadMarketList(
  players: readonly Player[],
  clubs: readonly WorldClub[] = [],
): ScoutedTarget[] {
  const clubNames = new Map(
    clubs.map((club) => [worldCareerClubId(club.id), club.name] as const),
  );
  return players
    .filter((player) => player.squad_status === "pro" && player.club_id !== null)
    .map((player, index) => ({
      player,
      estimate: initialEstimateForPlayer(player, index),
      clubName: player.club_id ? clubNames.get(player.club_id) : undefined,
    }));
}

export function initialEstimateForPlayer(player: Player, index = 0): AbilityEstimate {
  const band = hashPlayerId(player.id, index) % 10;
  if (band < 4) return { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 };
  if (band < 7) return { estimatedAbilityMean: 72, uncertaintyRange: 28, sampleSize: 1 };
  if (band < 9) return { estimatedAbilityMean: 78, uncertaintyRange: 14, sampleSize: 2 };
  return { estimatedAbilityMean: 84, uncertaintyRange: 6, sampleSize: 4 };
}

function hashPlayerId(playerId: string, index: number): number {
  let hash = index;
  for (const char of playerId) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x9e3779b1);
  }
  return hash >>> 0;
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

/** 0–199 ability scale for market CA bars (PRD 02 hard cap). */
export const CA_BAR_MAX = 199;

export function barTrackPercents(
  low: number,
  high: number,
  value: number,
  max: number,
): { ciLeft: number; ciWidth: number; fill: number } {
  const span = Math.max(1, max);
  const pct = (n: number) => Math.min(100, Math.max(0, (n / span) * 100));
  const left = pct(Math.min(low, high));
  const right = pct(Math.max(low, high));
  return {
    ciLeft: left,
    ciWidth: Math.max(0, right - left),
    fill: pct(value),
  };
}

export function marketFiltersActive(filters: MarketFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.position !== "all" ||
    filters.confidence !== "all" ||
    filters.age !== "all"
  );
}
