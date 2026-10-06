/** Offline FC Nordstern lattice study — calendar MDs or CA strength buckets (PRD 22 v2). */
import { matchdayFixtures, type ScheduledFixture, type TeamId } from "@fussballmanager/shared";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GameSession } from "../persistence/game-session.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { NORDSTERN_TEAM_ID } from "../world/world-generator.ts";
import { careerMatchSeed } from "../sim/career-match-setup.ts";
import { opponentScoutMatchIdFromFixture } from "./opponent-scout-match-id.ts";
import { resolveCareerMatchSquads } from "../match/career-match-squads.ts";
import { loadTacticsPreset } from "../match/tactics-presets.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import {
  COMPACT_OFFLINE_LATTICE,
  DEFAULT_OFFLINE_LATTICE,
  enumerateTacticPlans,
  latticePlanCount,
  type TacticLatticeConfig,
} from "./opponent-scout-lattice.ts";
import {
  aggregateMonteCarloRuns,
  rankPlanAggregates,
  runMonteCarloPlan,
  type PlanMonteCarloAggregate,
} from "./opponent-scout-monte-carlo.ts";
import { clubShortName } from "../sim/league-week.ts";
import { squadForLeagueClub } from "../sim/league-divisions.ts";
import {
  pickOpponentForStrengthBucket,
  pickOpponentsAcrossCaSpectrum,
  studyMetaForOpponent,
  type OpponentStrengthBucket,
} from "./opponent-scout-study-opponents.ts";

export type NordsternStudyFixture =
  | { type: "matchday"; matchday: number }
  | { type: "strength"; bucket: OpponentStrengthBucket }
  | { type: "opponent"; opponentId: TeamId };

export interface OpponentTacticsSnapshot {
  formation: string;
  mentality: number;
  pressing: number;
  lineHeight: number;
}

export interface NordsternStudyConfig {
  masterSeed: number;
  fixtures: readonly NordsternStudyFixture[];
  lattice: TacticLatticeConfig;
  seedRepeats: number;
  topK: number;
}

export const DEFAULT_NORDSTERN_STUDY: NordsternStudyConfig = {
  masterSeed: 2026,
  fixtures: [
    { type: "strength", bucket: "weaker" },
    { type: "strength", bucket: "similar" },
    { type: "strength", bucket: "stronger" },
  ],
  lattice: DEFAULT_OFFLINE_LATTICE,
  seedRepeats: 20,
  topK: 10,
};

export const QUICK_NORDSTERN_STUDY: NordsternStudyConfig = {
  masterSeed: 2026,
  fixtures: [{ type: "strength", bucket: "similar" }],
  lattice: COMPACT_OFFLINE_LATTICE,
  seedRepeats: 2,
  topK: 3,
};

export function buildQuickMultiOpponentStudyConfig(
  teamCount: number,
  session: GameSession = newGameSession(new Date("2026-08-01T12:00:00Z")),
): NordsternStudyConfig {
  const opponents = pickOpponentsAcrossCaSpectrum(session, teamCount);
  return {
    masterSeed: 2026,
    fixtures: opponents.map((row) => ({ type: "opponent", opponentId: row.opponentId })),
    lattice: COMPACT_OFFLINE_LATTICE,
    seedRepeats: 2,
    topK: 3,
  };
}

/** @deprecated Use `fixtures` — kept for tests that still pass matchdays. */
export function matchdayFixturesFromLegacy(matchdays: readonly number[]): NordsternStudyFixture[] {
  return matchdays.map((matchday) => ({ type: "matchday", matchday }));
}

export interface NordsternMatchdayStudyResult {
  matchday: number;
  week: number;
  matchId: string;
  opponentShortName: string;
  opponentTeamId: TeamId;
  strengthBucket: OpponentStrengthBucket | null;
  nordsternStarterCa: number | null;
  opponentStarterCa: number | null;
  caDelta: number | null;
  opponentTactics: OpponentTacticsSnapshot | null;
  planCount: number;
  seedRepeats: number;
  totalSims: number;
  elapsedMs: number;
  topPlans: PlanMonteCarloAggregate[];
}

export interface NordsternStudyResult {
  config: NordsternStudyConfig;
  latticePlanCount: number;
  matchdays: NordsternMatchdayStudyResult[];
  totalElapsedMs: number;
}

export interface NordsternStudyProgress {
  fixtureIndex: number;
  fixtureCount: number;
  planIndex: number;
  planCount: number;
  label: string;
}

const STUDY_SYNTHETIC_MATCHDAY_BASE = 90;

function setupForMatchday(session: GameSession, matchday: number): CareerMatchSetup | null {
  const week = matchday;
  const fixture = matchdayFixtures(session.league.club_ids, matchday).find(
    (entry) =>
      entry.homeTeamId === NORDSTERN_TEAM_ID || entry.awayTeamId === NORDSTERN_TEAM_ID,
  );
  if (!fixture) return null;
  const playerClubId = NORDSTERN_TEAM_ID;
  const opponentId =
    fixture.homeTeamId === playerClubId ? fixture.awayTeamId : fixture.homeTeamId;
  return buildStudySetup(session, matchday, week, fixture, playerClubId, opponentId);
}

function setupForStrengthBucket(
  session: GameSession,
  bucket: OpponentStrengthBucket,
  slotIndex: number,
): { setup: CareerMatchSetup; meta: Pick<PickedStudyMeta, "strengthBucket" | "nordsternStarterCa" | "opponentStarterCa" | "caDelta" | "opponentTeamId"> } | null {
  const picked = pickOpponentForStrengthBucket(session, bucket);
  if (!picked) return null;
  const matchday = STUDY_SYNTHETIC_MATCHDAY_BASE + slotIndex;
  const week = matchday;
  const fixture: ScheduledFixture = {
    homeTeamId: NORDSTERN_TEAM_ID,
    awayTeamId: picked.opponentId,
  };
  const setup = buildStudySetup(
    session,
    matchday,
    week,
    fixture,
    NORDSTERN_TEAM_ID,
    picked.opponentId,
  );
  return {
    setup,
    meta: {
      strengthBucket: bucket,
      nordsternStarterCa: picked.nordsternStarterCa,
      opponentStarterCa: picked.opponentStarterCa,
      caDelta: picked.caDelta,
      opponentTeamId: picked.opponentId,
    },
  };
}

function setupForOpponentId(
  session: GameSession,
  opponentId: TeamId,
  slotIndex: number,
): { setup: CareerMatchSetup; meta: PickedStudyMeta } | null {
  const picked = studyMetaForOpponent(session, opponentId);
  if (!picked) return null;
  const matchday = STUDY_SYNTHETIC_MATCHDAY_BASE + slotIndex;
  const week = matchday;
  const fixture: ScheduledFixture = {
    homeTeamId: NORDSTERN_TEAM_ID,
    awayTeamId: opponentId,
  };
  const setup = buildStudySetup(
    session,
    matchday,
    week,
    fixture,
    NORDSTERN_TEAM_ID,
    opponentId,
  );
  return {
    setup,
    meta: {
      strengthBucket: picked.bucket,
      nordsternStarterCa: picked.nordsternStarterCa,
      opponentStarterCa: picked.opponentStarterCa,
      caDelta: picked.caDelta,
      opponentTeamId: picked.opponentId,
    },
  };
}

function opponentTacticsSnapshot(
  session: GameSession,
  opponentId: TeamId,
): OpponentTacticsSnapshot | null {
  const squad = squadForLeagueClub(opponentId, session.rivalPlayers, NORDSTERN_TEAM_ID);
  if (!squad) return null;
  return {
    formation: squad.tactics.formation,
    mentality: squad.tactics.mentality,
    pressing: squad.tactics.pressing,
    lineHeight: squad.tactics.lineHeight,
  };
}

interface PickedStudyMeta {
  strengthBucket: OpponentStrengthBucket | null;
  nordsternStarterCa: number | null;
  opponentStarterCa: number | null;
  caDelta: number | null;
  opponentTeamId: TeamId;
}

function buildStudySetup(
  session: GameSession,
  matchday: number,
  week: number,
  fixture: ScheduledFixture,
  playerClubId: TeamId,
  opponentId: TeamId,
): CareerMatchSetup {
  return {
    seed: careerMatchSeed(
      session.masterSeed,
      session.season,
      week,
      matchday,
      fixture,
      session.league.club_ids,
    ),
    matchday,
    calendarWeek: week,
    fixture,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    playerClubId,
    opponentShortName: clubShortName(opponentId),
    isHome: fixture.homeTeamId === playerClubId,
  };
}

export function runNordsternOpponentScoutStudy(
  config: NordsternStudyConfig = DEFAULT_NORDSTERN_STUDY,
  session: GameSession = newGameSession(new Date("2026-08-01T12:00:00Z")),
  options?: { onProgress?: (progress: NordsternStudyProgress) => void },
): NordsternStudyResult {
  const started = performance.now();
  const basePlan = loadTacticsPreset(session.tacticsPresets, 1);
  const latticePlans = enumerateTacticPlans(basePlan, config.lattice);
  const matchdayResults: NordsternMatchdayStudyResult[] = [];
  let strengthSlot = 0;

  for (let fixtureIndex = 0; fixtureIndex < config.fixtures.length; fixtureIndex += 1) {
    const spec = config.fixtures[fixtureIndex]!;
    const mdStart = performance.now();
    let setup: CareerMatchSetup | null = null;
    let meta: PickedStudyMeta = {
      strengthBucket: null,
      nordsternStarterCa: null,
      opponentStarterCa: null,
      caDelta: null,
      opponentTeamId: "" as TeamId,
    };

    if (spec.type === "matchday") {
      setup = setupForMatchday(session, spec.matchday);
      if (setup) {
        const opponentId =
          setup.homeTeamId === setup.playerClubId ? setup.awayTeamId : setup.homeTeamId;
        meta.opponentTeamId = opponentId;
      }
    } else if (spec.type === "strength") {
      const built = setupForStrengthBucket(session, spec.bucket, strengthSlot);
      strengthSlot += 1;
      if (built) {
        setup = built.setup;
        meta = { ...meta, ...built.meta };
      }
    } else {
      const built = setupForOpponentId(session, spec.opponentId, strengthSlot);
      strengthSlot += 1;
      if (built) {
        setup = built.setup;
        meta = { ...meta, ...built.meta };
      }
    }

    if (!setup) continue;
    const matchId = opponentScoutMatchIdFromFixture(
      session.season,
      setup.calendarWeek,
      setup.matchday,
      setup.homeTeamId,
      setup.awayTeamId,
    );
    const squads = resolveCareerMatchSquads({
      setup,
      players: session.players,
      rivalPlayers: session.rivalPlayers,
      tacticsPresets: session.tacticsPresets,
    });
    if (!squads) continue;

    const aggregates: PlanMonteCarloAggregate[] = [];
    let seedOffset = 0;
    for (let planIndex = 0; planIndex < latticePlans.length; planIndex += 1) {
      const plan = latticePlans[planIndex]!;
      options?.onProgress?.({
        fixtureIndex,
        fixtureCount: config.fixtures.length,
        planIndex,
        planCount: latticePlans.length,
        label: plan.label,
      });
      const rows = runMonteCarloPlan({
        masterSeed: config.masterSeed,
        season: session.season,
        week: setup.calendarWeek,
        matchId,
        setup,
        homeSquad: squads.homeSquad,
        awaySquad: squads.awaySquad,
        plan,
        seedRepeats: config.seedRepeats,
        seedIndexOffset: seedOffset,
      });
      seedOffset += config.seedRepeats;
      aggregates.push(aggregateMonteCarloRuns(plan, rows));
    }

    const opponentId =
      meta.opponentTeamId ||
      (setup.homeTeamId === setup.playerClubId ? setup.awayTeamId : setup.homeTeamId);

    matchdayResults.push({
      matchday: setup.matchday,
      week: setup.calendarWeek,
      matchId,
      opponentShortName: setup.opponentShortName,
      opponentTeamId: opponentId,
      strengthBucket: meta.strengthBucket,
      nordsternStarterCa: meta.nordsternStarterCa,
      opponentStarterCa: meta.opponentStarterCa,
      caDelta: meta.caDelta,
      opponentTactics: opponentTacticsSnapshot(session, opponentId),
      planCount: latticePlans.length,
      seedRepeats: config.seedRepeats,
      totalSims: latticePlans.length * config.seedRepeats,
      elapsedMs: performance.now() - mdStart,
      topPlans: rankPlanAggregates(aggregates, config.topK),
    });
  }

  return {
    config,
    latticePlanCount: latticePlanCount(config.lattice),
    matchdays: matchdayResults,
    totalElapsedMs: performance.now() - started,
  };
}

export function nordsternStudyToCsv(result: NordsternStudyResult): string {
  const header =
    "strength_bucket,opponent_short,opp_formation,opp_mentality,opp_pressing,opp_line,nordstern_ca,opponent_ca,ca_delta,matchday,match_id,plan_id,label,formation,runs,win_pct,draw_pct,avg_goal_diff,avg_goals_for,avg_goals_against,clean_sheet_pct";
  const lines = [header];
  for (const md of result.matchdays) {
    for (const plan of md.topPlans) {
      lines.push(
        [
          md.strengthBucket ?? "",
          md.opponentShortName,
          md.opponentTactics?.formation ?? "",
          md.opponentTactics?.mentality ?? "",
          md.opponentTactics?.pressing ?? "",
          md.opponentTactics?.lineHeight ?? "",
          md.nordsternStarterCa ?? "",
          md.opponentStarterCa ?? "",
          md.caDelta ?? "",
          md.matchday,
          md.matchId,
          plan.planId,
          `"${plan.label.replace(/"/g, '""')}"`,
          plan.formation,
          plan.runs,
          plan.winPct,
          plan.drawPct,
          plan.avgGoalDiff.toFixed(2),
          plan.avgGoalsFor.toFixed(2),
          plan.avgGoalsAgainst.toFixed(2),
          plan.cleanSheetPct,
        ].join(","),
      );
    }
  }
  return lines.join("\n");
}

function strengthSectionTitle(md: NordsternMatchdayStudyResult): string {
  const ca =
    md.nordsternStarterCa != null && md.opponentStarterCa != null
      ? ` — Nordstern Ø${md.nordsternStarterCa} vs ${md.opponentShortName} Ø${md.opponentStarterCa} (Δ ${md.caDelta})`
      : "";
  const bucket =
    md.strengthBucket === "similar"
      ? "similar"
      : md.strengthBucket === "weaker"
        ? "weaker"
        : md.strengthBucket === "stronger"
          ? "stronger"
          : "";
  const bucketPrefix = bucket ? `[${bucket}] ` : "";
  const oppTact = md.opponentTactics
    ? ` · opp **${md.opponentTactics.formation}** M${md.opponentTactics.mentality} P${md.opponentTactics.pressing} L${md.opponentTactics.lineHeight}`
    : "";
  if (md.strengthBucket) {
    return `## ${bucketPrefix}vs ${md.opponentShortName}${ca}${oppTact}`;
  }
  return `## Spieltag ${md.matchday} vs ${md.opponentShortName}${ca}${oppTact}`;
}

export function nordsternStudySummaryMarkdown(result: NordsternStudyResult): string {
  const lines = [
    "# Opponent scout lattice — FC Nordstern strength sweep",
    "",
    `- Lattice plans: **${result.latticePlanCount}**`,
    `- Seed repeats per plan: **${result.config.seedRepeats}**`,
    `- Fixtures: **${result.matchdays.length}**`,
    `- Total runtime: **${(result.totalElapsedMs / 1000).toFixed(1)}s**`,
    "",
  ];
  for (const md of result.matchdays) {
    lines.push(strengthSectionTitle(md));
    lines.push(
      `- Sims: ${md.totalSims} (${md.planCount} plans × ${md.seedRepeats} seeds) in ${(md.elapsedMs / 1000).toFixed(1)}s`,
    );
    lines.push("");
    lines.push("| Plan | Win% | Ø Tordiff | Ø Tore |");
    lines.push("|------|------|-----------|--------|");
    for (const plan of md.topPlans) {
      lines.push(
        `| ${plan.label} | ${plan.winPct}% | ${plan.avgGoalDiff.toFixed(2)} | ${plan.avgGoalsFor.toFixed(1)}–${plan.avgGoalsAgainst.toFixed(1)} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export const DEFAULT_NORDSTERN_STUDY_ARTIFACT_BASENAME = "opponent-scout-nordstern-strength-sweep";

export function writeNordsternStudyArtifacts(
  result: NordsternStudyResult,
  researchDir: string,
  basename = DEFAULT_NORDSTERN_STUDY_ARTIFACT_BASENAME,
): void {
  mkdirSync(researchDir, { recursive: true });
  writeFileSync(join(researchDir, `${basename}.json`), JSON.stringify(result, null, 2));
  writeFileSync(join(researchDir, `${basename}.csv`), nordsternStudyToCsv(result));
  writeFileSync(join(researchDir, `${basename}.md`), nordsternStudySummaryMarkdown(result));
}
