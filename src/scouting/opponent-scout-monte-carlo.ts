/** PRD 22 v2 — repeated headless sims per lattice plan. */
import type { Squad, TeamId } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { buildMatchView } from "../../server/src/api/match-view.ts";
import { opponentScoutSimSeed } from "./opponent-scout-sims.ts";
import { statsFromView } from "./opponent-scout-bundle.ts";
import type { LatticeTacticPlan } from "./opponent-scout-lattice.ts";

export interface MonteCarloRunRow {
  planId: string;
  seedIndex: number;
  seed: number;
  goalsFor: number;
  goalsAgainst: number;
  shotsFor: number;
  shotsOnTargetFor: number;
  cornersFor: number;
  passCompletionPctFor: number | null;
  won: boolean;
  draw: boolean;
}

export interface PlanMonteCarloAggregate {
  planId: string;
  label: string;
  formation: string;
  runs: number;
  winPct: number;
  drawPct: number;
  avgGoalDiff: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  cleanSheetPct: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function runMonteCarloPlan(input: {
  masterSeed: number;
  season: number;
  week: number;
  matchId: string;
  setup: CareerMatchSetup;
  homeSquad: Squad;
  awaySquad: Squad;
  plan: LatticeTacticPlan;
  seedRepeats: number;
  seedIndexOffset?: number;
}): MonteCarloRunRow[] {
  const isPlayerHome = input.setup.playerClubId === input.setup.homeTeamId;
  const rows: MonteCarloRunRow[] = [];
  for (let seedIndex = 0; seedIndex < input.seedRepeats; seedIndex += 1) {
    const globalIndex = (input.seedIndexOffset ?? 0) + seedIndex;
    const seed = opponentScoutSimSeed(
      input.masterSeed,
      input.season,
      input.week,
      input.matchId,
      globalIndex,
      input.plan.tacticHash,
    );
    const view = buildMatchView({
      seed,
      home: input.homeSquad,
      away: input.awaySquad,
      humanTeamId: input.setup.playerClubId as TeamId,
      homePlan: isPlayerHome ? input.plan.plan : undefined,
      awayPlan: isPlayerHome ? undefined : input.plan.plan,
    });
    const snap = statsFromView(view, input.setup);
    const won = snap.goalsFor > snap.goalsAgainst;
    const draw = snap.goalsFor === snap.goalsAgainst;
    rows.push({
      planId: input.plan.planId,
      seedIndex: globalIndex,
      seed,
      goalsFor: snap.goalsFor,
      goalsAgainst: snap.goalsAgainst,
      shotsFor: snap.shotsFor,
      shotsOnTargetFor: snap.shotsOnTargetFor,
      cornersFor: snap.cornersFor,
      passCompletionPctFor: snap.passCompletionPctFor,
      won,
      draw,
    });
  }
  return rows;
}

export function aggregateMonteCarloRuns(
  plan: LatticeTacticPlan,
  rows: readonly MonteCarloRunRow[],
): PlanMonteCarloAggregate {
  const n = rows.length;
  const wins = rows.filter((row) => row.won).length;
  const draws = rows.filter((row) => row.draw).length;
  const cleanSheets = rows.filter((row) => row.goalsAgainst === 0).length;
  const goalDiffs = rows.map((row) => row.goalsFor - row.goalsAgainst);
  const pct = (count: number) => (n === 0 ? 0 : Math.round((100 * count) / n));
  return {
    planId: plan.planId,
    label: plan.label,
    formation: plan.formation,
    runs: n,
    winPct: pct(wins),
    drawPct: pct(draws),
    avgGoalDiff: mean(goalDiffs),
    avgGoalsFor: mean(rows.map((row) => row.goalsFor)),
    avgGoalsAgainst: mean(rows.map((row) => row.goalsAgainst)),
    cleanSheetPct: pct(cleanSheets),
  };
}

export function rankPlanAggregates(
  aggregates: readonly PlanMonteCarloAggregate[],
  topK = 10,
): PlanMonteCarloAggregate[] {
  return [...aggregates]
    .sort((left, right) => {
      if (right.avgGoalDiff !== left.avgGoalDiff) {
        return right.avgGoalDiff - left.avgGoalDiff;
      }
      return right.winPct - left.winPct;
    })
    .slice(0, topK);
}
