/** PRD 22 v2 — aggregate metrics for Postfach 4×3 grid. */
import { passCompletionPct, type MatchSideStats } from "@fussballmanager/shared";
import type { OpponentScoutSimVariant } from "./opponent-scout-sims.ts";

export interface OpponentScoutBundleSummary {
  simCount: number;
  modeScoreline: string;
  winPct: number;
  drawPct: number;
  lossPct: number;
  avgGoalDiff: number;
  avgGoalsFor: number;
  avgShotsFor: number;
  avgShotsOnTargetFor: number;
  avgGoalsAgainst: number;
  avgShotsAgainst: number;
  avgShotsOnTargetAgainst: number;
  avgPassCompletionPct: number | null;
  avgCornersFor: number;
  avgCornersAgainst: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildOpponentScoutBundleSummary(
  variants: readonly OpponentScoutSimVariant[],
  modeScoreline: string,
): OpponentScoutBundleSummary {
  const n = variants.length;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  const goalsFor: number[] = [];
  const goalsAgainst: number[] = [];
  const shotsFor: number[] = [];
  const shotsOnTargetFor: number[] = [];
  const shotsAgainst: number[] = [];
  const shotsOnTargetAgainst: number[] = [];
  const cornersFor: number[] = [];
  const cornersAgainst: number[] = [];
  const passPcts: number[] = [];

  for (const variant of variants) {
    const gf = variant.goalsFor ?? 0;
    const ga = variant.goalsAgainst ?? 0;
    goalsFor.push(gf);
    goalsAgainst.push(ga);
    if (gf > ga) wins += 1;
    else if (gf === ga) draws += 1;
    else losses += 1;
    shotsFor.push(variant.shotsFor ?? 0);
    shotsOnTargetFor.push(variant.shotsOnTargetFor ?? 0);
    shotsAgainst.push(variant.shotsAgainst ?? 0);
    shotsOnTargetAgainst.push(variant.shotsOnTargetAgainst ?? 0);
    cornersFor.push(variant.cornersFor ?? 0);
    cornersAgainst.push(variant.cornersAgainst ?? 0);
    if (variant.passCompletionPctFor != null) {
      passPcts.push(variant.passCompletionPctFor);
    }
  }

  const pct = (count: number) => (n === 0 ? 0 : Math.round((100 * count) / n));

  return {
    simCount: n,
    modeScoreline,
    winPct: pct(wins),
    drawPct: pct(draws),
    lossPct: pct(losses),
    avgGoalDiff: mean(goalsFor.map((gf, index) => gf - goalsAgainst[index]!)),
    avgGoalsFor: mean(goalsFor),
    avgShotsFor: mean(shotsFor),
    avgShotsOnTargetFor: mean(shotsOnTargetFor),
    avgGoalsAgainst: mean(goalsAgainst),
    avgShotsAgainst: mean(shotsAgainst),
    avgShotsOnTargetAgainst: mean(shotsOnTargetAgainst),
    avgPassCompletionPct: passPcts.length > 0 ? Math.round(mean(passPcts)) : null,
    avgCornersFor: mean(cornersFor),
    avgCornersAgainst: mean(cornersAgainst),
  };
}

/** Side stats snapshot from a finished match view (player perspective). */
export function playerMatchStatsFromPairStats(
  stats: { home: MatchSideStats; away: MatchSideStats },
  isPlayerHome: boolean,
  goalsFor: number,
  goalsAgainst: number,
) {
  const forSide = isPlayerHome ? stats.home : stats.away;
  const againstSide = isPlayerHome ? stats.away : stats.home;
  return {
    goalsFor,
    goalsAgainst,
    shotsFor: forSide.shots,
    shotsOnTargetFor: forSide.shotsOnTarget,
    shotsAgainst: againstSide.shots,
    shotsOnTargetAgainst: againstSide.shotsOnTarget,
    cornersFor: forSide.corners,
    cornersAgainst: againstSide.corners,
    passCompletionPctFor: passCompletionPct(forSide),
  };
}
