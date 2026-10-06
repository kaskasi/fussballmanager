/** PRD 22 — 10× career match sims + report rows. */
import type { FormationId, MatchView, SandboxPlan } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import type { Player } from "../types/player.ts";
import { resolveCareerMatchSquads } from "../match/career-match-squads.ts";
import type { MatchLineupState } from "../match/lineup-board.ts";
import {
  defaultTacticsPresets,
  loadTacticsPreset,
  type TacticsPresetSlot,
} from "../match/tactics-presets.ts";
import {
  OPPONENT_SCOUT_SIM_COUNT,
  opponentScoutSimSeed,
  summarizeOpponentScoutVariants,
  type OpponentScoutBundleResult,
  type OpponentScoutSimVariant,
} from "./opponent-scout-sims.ts";
import { buildMatchView } from "../../server/src/api/match-view.ts";
import {
  buildOpponentScoutBundleSummary,
  playerMatchStatsFromPairStats,
  type OpponentScoutBundleSummary,
} from "./opponent-scout-bundle-summary.ts";
import type { OpponentScoutRiskTag } from "./opponent-scout-sims.ts";

export interface OpponentScoutVariantPlan {
  variantIndex: number;
  label: string;
  formation: FormationId;
  plan: SandboxPlan;
  tacticHash: number;
  risk: OpponentScoutRiskTag;
}

export interface OpponentScoutRecommendation {
  formationLabel: string;
  risk: OpponentScoutRiskTag;
  goalsForBand: [number, number];
  goalsAgainstBand: [number, number];
  variantCount: number;
  winPct: number;
  drawPct: number;
  lossPct: number;
  avgGoalDiff: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  applyPlan?: SandboxPlan;
}

export interface OpponentScoutReport extends OpponentScoutBundleResult {
  recommendations: OpponentScoutRecommendation[];
  assignedScoutTrust: number;
  bundleSummary: OpponentScoutBundleSummary;
}

export function tacticHashFromPlan(plan: SandboxPlan): number {
  let hash = 0;
  const formation = plan.formation ?? "";
  for (const char of formation) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  hash = (hash * 31 + Math.round(plan.pressing ?? 0)) | 0;
  hash = (hash * 31 + Math.round(plan.lineHeight ?? 0)) | 0;
  return hash >>> 0;
}

export function riskTagFromPlan(plan: SandboxPlan): OpponentScoutRiskTag {
  const line = plan.lineHeight ?? 50;
  const press = plan.pressing ?? 50;
  if (line >= 62 && press >= 58) return "high_line";
  if (line <= 45 && press <= 48) return "low_block";
  return "balanced";
}

export function opponentScoutVariantPlans(
  basePlan: SandboxPlan,
  presets: readonly TacticsPresetSlot[] = defaultTacticsPresets(),
): OpponentScoutVariantPlan[] {
  const normalized = defaultTacticsPresets().map((fallback) => {
    const saved = presets.find((entry) => entry.id === fallback.id);
    return saved?.plan?.formation ? saved : fallback;
  });
  const plans: OpponentScoutVariantPlan[] = [];
  for (let variantIndex = 0; variantIndex < OPPONENT_SCOUT_SIM_COUNT; variantIndex += 1) {
    const preset = normalized[variantIndex % normalized.length]!;
    const useBase = variantIndex === 0;
    const plan = useBase ? { ...basePlan } : { ...preset.plan };
    const label = useBase ? basePlan.formation : `${preset.label} (${preset.plan.formation})`;
    plans.push({
      variantIndex,
      label,
      formation: plan.formation,
      plan,
      tacticHash: tacticHashFromPlan(plan),
      risk: riskTagFromPlan(plan),
    });
  }
  return plans;
}

export function statsFromView(view: MatchView, setup: CareerMatchSetup) {
  const last = view.frames[view.frames.length - 1];
  const stats = last?.stats ?? view.kickoff.stats;
  const isHome = setup.playerClubId === setup.homeTeamId;
  const goalsFor = isHome ? view.finalScore.home : view.finalScore.away;
  const goalsAgainst = isHome ? view.finalScore.away : view.finalScore.home;
  return playerMatchStatsFromPairStats(stats, isHome, goalsFor, goalsAgainst);
}

export function buildOpponentScoutVariants(input: {
  masterSeed: number;
  season: number;
  week: number;
  matchId: string;
  setup: CareerMatchSetup;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  matchLineup?: MatchLineupState;
  tacticsPresets: readonly TacticsPresetSlot[];
}): { variants: OpponentScoutSimVariant[]; variantPlans: OpponentScoutVariantPlan[] } {
  const squads = resolveCareerMatchSquads({
    setup: input.setup,
    players: input.players,
    rivalPlayers: input.rivalPlayers,
    matchLineup: input.matchLineup,
    tacticsPresets: input.tacticsPresets,
  });
  if (!squads) {
    throw new Error("opponent_scout_squads_unavailable");
  }

  const basePlan =
    input.matchLineup?.plan ?? loadTacticsPreset(input.tacticsPresets, 1);
  const variantPlans = opponentScoutVariantPlans(basePlan, input.tacticsPresets);
  const isPlayerHome = input.setup.playerClubId === input.setup.homeTeamId;
  const variants: OpponentScoutSimVariant[] = [];
  for (const entry of variantPlans) {
    const seed = opponentScoutSimSeed(
      input.masterSeed,
      input.season,
      input.week,
      input.matchId,
      entry.variantIndex,
      entry.tacticHash,
    );
    const view = buildMatchView({
      seed,
      home: squads.homeSquad,
      away: squads.awaySquad,
      humanTeamId: input.setup.playerClubId,
      homePlan: isPlayerHome ? entry.plan : undefined,
      awayPlan: isPlayerHome ? undefined : entry.plan,
    });
    const snap = statsFromView(view, input.setup);
    variants.push({
      variantIndex: entry.variantIndex,
      seed,
      homeScore: view.finalScore.home,
      awayScore: view.finalScore.away,
      eventCount: view.eventCount,
      formationLabel: entry.label,
      risk: entry.risk,
      goalsFor: snap.goalsFor,
      goalsAgainst: snap.goalsAgainst,
      shotsFor: snap.shotsFor,
      shotsOnTargetFor: snap.shotsOnTargetFor,
      shotsAgainst: snap.shotsAgainst,
      shotsOnTargetAgainst: snap.shotsOnTargetAgainst,
      cornersFor: snap.cornersFor,
      cornersAgainst: snap.cornersAgainst,
      passCompletionPctFor: snap.passCompletionPctFor,
      plan: { ...entry.plan },
    });
  }
  return { variants, variantPlans };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index]!;
}

function trustBandPadding(trust: number): number {
  if (trust >= 75) return 0;
  if (trust >= 55) return 1;
  return 2;
}

export function buildOpponentScoutReport(
  matchId: string,
  variants: readonly OpponentScoutSimVariant[],
  scoutTrust: number,
): OpponentScoutReport {
  const summary = summarizeOpponentScoutVariants(matchId, variants);
  const pad = trustBandPadding(scoutTrust);
  const maxRows = scoutTrust >= 55 ? 3 : 2;

  const byFormation = new Map<string, OpponentScoutSimVariant[]>();
  for (const variant of variants) {
    const key = variant.formationLabel ?? variant.formation ?? "—";
    const list = byFormation.get(key) ?? [];
    list.push(variant);
    byFormation.set(key, list);
  }

  const recommendations: OpponentScoutRecommendation[] = [];
  for (const [formationLabel, group] of byFormation) {
    const goalsFor = group.map((v) => v.goalsFor ?? 0).sort((a, b) => a - b);
    const goalsAgainst = group.map((v) => v.goalsAgainst ?? 0).sort((a, b) => a - b);
    const p25For = percentile(goalsFor, 0.25);
    const p75For = percentile(goalsFor, 0.75);
    const p25Against = percentile(goalsAgainst, 0.25);
    const p75Against = percentile(goalsAgainst, 0.75);
    const risk = group[0]?.risk ?? "balanced";
    let wins = 0;
    let draws = 0;
    let losses = 0;
    const goalDiffs: number[] = [];
    for (const variant of group) {
      const gf = variant.goalsFor ?? 0;
      const ga = variant.goalsAgainst ?? 0;
      goalDiffs.push(gf - ga);
      if (gf > ga) wins += 1;
      else if (gf === ga) draws += 1;
      else losses += 1;
    }
    const n = group.length;
    const pct = (count: number) => (n === 0 ? 0 : Math.round((100 * count) / n));
    const mean = (values: number[]) =>
      values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
    const bestVariant = group.reduce((best, variant) => {
      const diff = (variant.goalsFor ?? 0) - (variant.goalsAgainst ?? 0);
      const bestDiff = (best.goalsFor ?? 0) - (best.goalsAgainst ?? 0);
      return diff > bestDiff ? variant : best;
    }, group[0]!);
    recommendations.push({
      formationLabel,
      risk,
      goalsForBand: [Math.max(0, p25For - pad), p75For + pad],
      goalsAgainstBand: [Math.max(0, p25Against - pad), p75Against + pad],
      variantCount: group.length,
      winPct: pct(wins),
      drawPct: pct(draws),
      lossPct: pct(losses),
      avgGoalDiff: mean(goalDiffs),
      avgGoalsFor: mean(goalsFor),
      avgGoalsAgainst: mean(goalsAgainst),
      applyPlan: bestVariant.plan ? { ...bestVariant.plan } : undefined,
    });
  }

  recommendations.sort((left, right) => {
    if (right.avgGoalDiff !== left.avgGoalDiff) {
      return right.avgGoalDiff - left.avgGoalDiff;
    }
    return right.winPct - left.winPct;
  });

  return {
    ...summary,
    recommendations: recommendations.slice(0, maxRows),
    assignedScoutTrust: scoutTrust,
    bundleSummary: buildOpponentScoutBundleSummary(variants, summary.modeScoreline),
  };
}
