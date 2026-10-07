/**
 * F4.3 — Scout network tiers, capacity and observation accuracy (PRD 04.2).
 */
import { applyObservation, type ObservationKind } from "./estimate-model.ts";
import type { AbilityEstimate, PlayerKnowledge } from "./estimate-model.ts";
import { DEFAULT_SCOUT_CAPACITY } from "./scout-assignments.ts";

export type ScoutTierId = "local" | "international" | "elite";

export const MAX_HIRED_SCOUTS = 6;

export interface ScoutTierDef {
  id: ScoutTierId;
  label: string;
  capacity: number;
  accuracy_modifier: number;
  wage_weekly: number;
  regions: string;
}

export interface HiredScout {
  id: string;
  name: string;
  tier: ScoutTierId;
  trust: number;
  wage_weekly: number;
}

export interface ScoutNetworkState {
  scouts: HiredScout[];
}

export const SCOUT_TIERS: Record<ScoutTierId, ScoutTierDef> = {
  local: {
    id: "local",
    label: "Lokal",
    capacity: 3,
    accuracy_modifier: 0.8,
    wage_weekly: 700,
    regions: "Regionalliga & Jugend",
  },
  international: {
    id: "international",
    label: "International",
    capacity: 6,
    accuracy_modifier: 1.1,
    wage_weekly: 4_000,
    regions: "Europa, Südamerika",
  },
  elite: {
    id: "elite",
    label: "Elite",
    capacity: 4,
    accuracy_modifier: 1.3,
    wage_weekly: 10_500,
    regions: "Global · Drive & Breakouts",
  },
};

const FIRST = ["Lars", "Tim", "Nico", "Felix", "Jonas", "Paul", "Max", "Ben"];
const LAST = ["Krüger", "Vogt", "Berg", "Haas", "Lorenz", "Brandt", "Kuhn", "Pohl"];

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

export function defaultScoutNetwork(season: number, masterSeed: number): ScoutNetworkState {
  const rng = mulberry32(hashSeed([masterSeed, season, "starter-scout"]));
  const first = FIRST[Math.floor(rng() * FIRST.length)] ?? "Lars";
  const last = LAST[Math.floor(rng() * LAST.length)] ?? "Krüger";
  return {
    scouts: [
      {
        id: `scout_local_${season}_0`,
        name: `${first} ${last}`,
        tier: "local",
        trust: 58 + Math.floor(rng() * 12),
        wage_weekly: SCOUT_TIERS.local.wage_weekly,
      },
    ],
  };
}

export function normalizeScoutNetwork(
  network: ScoutNetworkState | undefined,
  season: number,
  masterSeed: number,
): ScoutNetworkState {
  if (!network?.scouts?.length) return defaultScoutNetwork(season, masterSeed);
  return { scouts: [...network.scouts] };
}

export function scoutNetworkCapacity(network: ScoutNetworkState): number {
  if (network.scouts.length === 0) return DEFAULT_SCOUT_CAPACITY;
  return network.scouts.reduce((sum, scout) => sum + SCOUT_TIERS[scout.tier].capacity, 0);
}

export function scoutNetworkAccuracyModifier(network: ScoutNetworkState): number {
  if (network.scouts.length === 0) return 1;
  const totalCapacity = scoutNetworkCapacity(network);
  let weighted = 0;
  for (const scout of network.scouts) {
    const tier = SCOUT_TIERS[scout.tier];
    const trustBoost = 0.9 + (scout.trust / 100) * 0.2;
    weighted += tier.capacity * tier.accuracy_modifier * trustBoost;
  }
  return weighted / totalCapacity;
}

export function scoutNetworkWeeklyWage(network: ScoutNetworkState): number {
  return network.scouts.reduce((sum, scout) => sum + scout.wage_weekly, 0);
}

export function scoutCandidates(
  tier: ScoutTierId,
  season: number,
  week: number,
  masterSeed: number,
): HiredScout[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, tier, "scout-market"]));
  const def = SCOUT_TIERS[tier];
  return [0, 1, 2].map((index) => {
    const first = FIRST[Math.floor(rng() * FIRST.length)] ?? "Scout";
    const last = LAST[Math.floor(rng() * LAST.length)] ?? "Team";
    const trust = Math.round(52 + rng() * 38);
    return {
      id: `scout_${tier}_${season}_${week}_${index}`,
      name: `${first} ${last}`,
      tier,
      trust,
      wage_weekly: Math.round(def.wage_weekly * (0.95 + rng() * 0.15)),
    };
  });
}

/** Weekly market minus scouts already on the payroll (same candidate id). */
export function availableScoutCandidates(
  tier: ScoutTierId,
  season: number,
  week: number,
  masterSeed: number,
  network: ScoutNetworkState,
): HiredScout[] {
  const hiredIds = new Set(network.scouts.map((scout) => scout.id));
  return scoutCandidates(tier, season, week, masterSeed).filter((candidate) => !hiredIds.has(candidate.id));
}

export function canHireScout(network: ScoutNetworkState): boolean {
  return network.scouts.length < MAX_HIRED_SCOUTS;
}

export function hireScout(network: ScoutNetworkState, scout: HiredScout): ScoutNetworkState {
  if (!canHireScout(network)) return network;
  if (network.scouts.some((existing) => existing.id === scout.id)) {
    return network;
  }
  return { scouts: [...network.scouts, scout] };
}

export function fireScout(network: ScoutNetworkState, scoutId: string): ScoutNetworkState {
  return { scouts: network.scouts.filter((scout) => scout.id !== scoutId) };
}

const OBSERVATION_REDUCTION: Record<Exclude<ObservationKind, "map_club_visit">, number> = {
  live_match_view: 15,
  scout_visit_report: 8,
  video_review: 5,
  trial_period: 25,
};

/** Applies scout tier accuracy to observation strength (PRD 04.2). */
export function applyObservationWithAccuracy(
  knowledge: PlayerKnowledge,
  kind: ObservationKind,
  accuracyModifier: number,
): PlayerKnowledge {
  if (knowledge.status === "owned") return knowledge;
  if (kind === "map_club_visit") return applyObservation(knowledge, kind);
  const base = OBSERVATION_REDUCTION[kind satisfies Exclude<ObservationKind, "map_club_visit">];
  const reducesUncertaintyBy = Math.max(1, Math.round(base * accuracyModifier));
  return {
    status: "scouted",
    estimate: {
      estimatedAbilityMean: knowledge.estimate.estimatedAbilityMean,
      uncertaintyRange: Math.max(0, knowledge.estimate.uncertaintyRange - reducesUncertaintyBy),
      sampleSize: knowledge.estimate.sampleSize + (kind === "trial_period" ? 3 : 1),
    },
  };
}

export function formatTrust(trust: number): string {
  if (trust >= 80) return "Sehr verlässlich";
  if (trust >= 65) return "Solide";
  return "Durchwachsen";
}
