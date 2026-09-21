import type {
  MatchEvent,
  MatchState,
  MatchView,
  MatchViewFrame,
  MatchViewLine,
  MatchViewRosterPlayer,
  SandboxPlan,
  Squad,
} from "@fussballmanager/shared";
import {
  applySandboxPlan,
  parseSandboxPlan,
  sandboxPlanFromTactics,
  SEED_MATCHUP,
} from "@fussballmanager/shared";
import {
  commentateLine,
  commentaryContextFromSquads,
  isCommentaryWorthy,
} from "../commentary/index.ts";
import { createInitialState, step } from "../engine/index.ts";

function rosterOf(squad: Squad): MatchViewRosterPlayer[] {
  return [
    ...squad.starters.map((place) => ({
      id: place.player.id,
      teamId: place.player.teamId,
      name: place.player.name,
      role: place.player.role,
      shirt: place.player.shirt,
      starter: true,
    })),
    ...squad.bench.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      name: player.name,
      role: player.role,
      shirt: player.shirt,
      starter: false,
    })),
  ];
}

function frameFrom(state: MatchState, seq: number): MatchViewFrame {
  return {
    seq,
    ball: state.ball,
    score: { ...state.score },
    possessionTeamId: state.possessionTeamId,
    ballCarrierId: state.ballCarrierId,
    clock: state.clock,
    ballInAir: state.ballInAir,
    dots: state.players
      .filter((player) => player.onPitch && !player.sentOff)
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        x: player.position.x,
        y: player.position.y,
      })),
  };
}

export function parseViewSeed(raw: unknown, fallback = 2026): number {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return fallback;
  }
  const seed = typeof raw === "number" ? raw : Number.parseInt(raw, 10);
  if (!Number.isFinite(seed)) {
    return fallback;
  }
  return Math.min(999_999_999, Math.max(1, Math.trunc(seed)));
}

export function buildMatchView(input: {
  seed?: number;
  home?: Squad;
  away?: Squad;
  homePlan?: SandboxPlan;
  awayPlan?: SandboxPlan;
  maxSteps?: number;
}): MatchView {
  const homeBase = input.home ?? SEED_MATCHUP.home;
  const awayBase = input.away ?? SEED_MATCHUP.away;
  const homePlan =
    input.homePlan ?? sandboxPlanFromTactics(homeBase.tactics);
  const awayPlan =
    input.awayPlan ?? sandboxPlanFromTactics(awayBase.tactics);
  const home = applySandboxPlan(homeBase, homePlan);
  const away = applySandboxPlan(awayBase, awayPlan);
  const seed = input.seed ?? 2026;
  const maxSteps = input.maxSteps ?? 20_000;
  const initial = createInitialState({
    home,
    away,
    seed,
    humanTeamId: home.team.id,
  });
  const ctx = commentaryContextFromSquads(home, away);
  const kickoff = frameFrom(initial, 0);
  const frames: MatchViewFrame[] = [];
  const lines: MatchViewLine[] = [];
  let current = initial;
  let previousEvent: MatchEvent | undefined;

  for (let i = 0; i < maxSteps; i += 1) {
    const result = step({
      state: current,
      homeTactics: current.homeTactics,
      awayTactics: current.awayTactics,
    });
    current = result.state;
    frames.push(frameFrom(current, result.event.seq));
    if (isCommentaryWorthy(result.event, previousEvent)) {
      lines.push({
        seq: result.event.seq,
        text: commentateLine(result.event, ctx),
      });
    }
    previousEvent = result.event;
    if (result.event.type === "match_end") {
      break;
    }
  }

  if (frames.length === 0 || previousEvent?.type !== "match_end") {
    throw new Error("Match view did not reach match_end");
  }

  return {
    seed: initial.rng.seed,
    home: {
      id: home.team.id,
      name: home.team.name,
      shortName: home.team.shortName,
      formation: home.tactics.formation,
    },
    away: {
      id: away.team.id,
      name: away.team.name,
      shortName: away.team.shortName,
      formation: away.tactics.formation,
    },
    homePlan: sandboxPlanFromTactics(home.tactics),
    awayPlan: sandboxPlanFromTactics(away.tactics),
    roster: [...rosterOf(home), ...rosterOf(away)],
    kickoff,
    frames,
    lines,
    finalScore: current.score,
    eventCount: frames.length,
  };
}

export function parseMatchBody(raw: unknown): {
  seed: number;
  homePlan: SandboxPlan;
  awayPlan: SandboxPlan;
} {
  const body =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    seed: parseViewSeed(body.seed),
    homePlan: parseSandboxPlan(
      body.home,
      sandboxPlanFromTactics(SEED_MATCHUP.home.tactics),
    ),
    awayPlan: parseSandboxPlan(
      body.away,
      sandboxPlanFromTactics(SEED_MATCHUP.away.tactics),
    ),
  };
}
