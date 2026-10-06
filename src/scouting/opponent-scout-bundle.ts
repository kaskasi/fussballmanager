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
}

export interface OpponentScoutReport extends OpponentScoutBundleResult {
  recommendations: OpponentScoutRecommendation[];
  assignedScoutTrust: number;
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

function statsFromView(view: MatchView, playerClubId: string, setup: CareerMatchSetup) {
  const last = view.frames[view.frames.length - 1];
  const stats = last?.stats ?? view.kickoff.stats;
  const isHome = setup.playerClubId === setup.homeTeamId;
  const forSide = isHome ? stats.home : stats.away;
  const againstSide = isHome ? stats.away : stats.home;
  return {
    goalsFor: isHome ? view.finalScore.home : view.finalScore.away,
    goalsAgainst: isHome ? view.finalScore.away : view.finalScore.home,
    shotsFor: forSide.shots,
    shotsOnTargetFor: forSide.shotsOnTarget,
    shotsAgainst: againstSide.shots,
    shotsOnTargetAgainst: againstSide.shotsOnTarget,
  };
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
    const snap = statsFromView(view, input.setup.playerClubId, input.setup);
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
    recommendations.push({
      formationLabel,
      risk,
      goalsForBand: [Math.max(0, p25For - pad), p75For + pad],
      goalsAgainstBand: [Math.max(0, p25Against - pad), p75Against + pad],
      variantCount: group.length,
    });
  }

  recommendations.sort((left, right) => {
    const leftMid = (left.goalsForBand[0] + left.goalsForBand[1]) / 2 - left.goalsAgainstBand[1];
    const rightMid = (right.goalsForBand[0] + right.goalsForBand[1]) / 2 - right.goalsAgainstBand[1];
    return rightMid - leftMid;
  });

  return {
    ...summary,
    recommendations: recommendations.slice(0, maxRows),
    assignedScoutTrust: scoutTrust,
  };
}
