/** PRD 22 — headless opponent prep sims (engine wrapper only). */
import type { SandboxPlan } from "@fussballmanager/shared";

export const OPPONENT_SCOUT_SIM_COUNT = 10;
export const OPPONENT_SCOUT_WORKING_DAYS = 4;

export type OpponentScoutRiskTag = "balanced" | "high_line" | "low_block";

export interface OpponentScoutSimVariant {
  variantIndex: number;
  seed: number;
  homeScore: number;
  awayScore: number;
  eventCount: number;
  formationLabel?: string;
  formation?: string;
  risk?: OpponentScoutRiskTag;
  goalsFor?: number;
  goalsAgainst?: number;
  shotsFor?: number;
  shotsOnTargetFor?: number;
  shotsAgainst?: number;
  shotsOnTargetAgainst?: number;
  cornersFor?: number;
  cornersAgainst?: number;
  passCompletionPctFor?: number | null;
  /** Player tactic used for this sim (for “apply to lineup”). */
  plan?: SandboxPlan;
}

export interface OpponentScoutBundleResult {
  matchId: string;
  variants: OpponentScoutSimVariant[];
  /** Most common scoreline among variants. */
  modeScoreline: string;
}

/** Deterministic seed chain for tactic variants (reproducible prep reports). */
export function opponentScoutSimSeed(
  masterSeed: number,
  season: number,
  week: number,
  matchId: string,
  variantIndex: number,
  tacticHash = 0,
): number {
  let hash = masterSeed ^ (season * 997) ^ (week * 991);
  for (const char of matchId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  hash = (hash * 31 + variantIndex) | 0;
  hash = (hash * 31 + tacticHash) | 0;
  return hash >>> 0;
}

export function summarizeOpponentScoutVariants(
  matchId: string,
  variants: readonly OpponentScoutSimVariant[],
): OpponentScoutBundleResult {
  const counts = new Map<string, number>();
  for (const variant of variants) {
    const key = `${variant.homeScore}:${variant.awayScore}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let modeScoreline = "0:0";
  let best = 0;
  for (const [line, count] of counts) {
    if (count > best) {
      best = count;
      modeScoreline = line;
    }
  }
  return { matchId, variants: [...variants], modeScoreline };
}
