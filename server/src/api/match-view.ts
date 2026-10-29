import type {
  BroadcastStoryContext,
  MatchEvent,
  MatchState,
  MatchView,
  MatchViewFrame,
  MatchViewLine,
  MatchViewRosterPlayer,
  SandboxPlan,
  Squad,
  TeamId,
} from "@fussballmanager/shared";
import {
  applySandboxPlan,
  applyMatchStatEvent,
  buildMatchReport,
  emptyPairStats,
  parseSandboxPlan,
  sandboxPlanFromTactics,
  SEED_MATCHUP,
} from "@fussballmanager/shared";
import {
  createBroadcastDirector,
  commentaryContextFromSquads,
  type CommentaryContext,
} from "../commentary/index.ts";
import { createInitialState, step } from "../engine/index.ts";
import {
  applySubstitutionRequest,
  recordSubstitution,
  substitutionDue,
  substitutionLedger,
  type MatchSubstitutionRequest,
} from "./manual-substitution.ts";

export type { MatchSubstitutionRequest } from "./manual-substitution.ts";

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

function frameFrom(
  state: MatchState,
  seq: number,
  event: MatchEvent | undefined,
  stats: MatchViewFrame["stats"],
  ctx: CommentaryContext,
): MatchViewFrame {
  let cue: MatchViewFrame["cue"] = null;
  let cueDetail: MatchViewFrame["cueDetail"];
  if (event?.type === "goal") {
    cue = "goal";
    cueDetail = { label: ctx.playerName(event.scorer.playerId) };
  } else if (event?.type === "substitution") {
    cue = "substitution";
    cueDetail = {
      label: `${ctx.playerName(event.playerOff.playerId)} → ${ctx.playerName(event.playerOn.playerId)}`,
      teamShortName: ctx.teamName(event.teamId),
    };
  } else if (event?.type === "restart" && event.phase === "corner") {
    cue = "corner";
  } else if (event?.type === "restart" && event.phase === "penalty") {
    cue = "penalty";
  } else if (event?.type === "turnover" && event.reason === "offside") {
    cue = "offside";
  } else if (event?.type === "restart" && event.phase === "throw_in") {
    cue = "throw_in";
  } else if (event?.type === "restart" && event.phase === "goal_kick") {
    cue = "goal_kick";
  } else if (event?.type === "restart" && event.phase === "kickoff") {
    cue = "kickoff";
  } else if (event?.type === "shot") {
    cue = "shot";
  }
  return {
    seq,
    ball: state.ball,
    score: { ...state.score },
    possessionTeamId: state.possessionTeamId,
    ballCarrierId: state.ballCarrierId,
    clock: state.clock,
    ballInAir: state.ballInAir,
    cue,
    cueDetail,
    stats: {
      home: { ...stats.home },
      away: { ...stats.away },
    },
    dots: state.players
      .filter((player) => player.onPitch && !player.sentOff)
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        x: player.position.x,
        y: player.position.y,
        fatigue: Math.round(player.fatigue),
      })),
    substitutionsUsed: { ...state.substitutionsUsed },
    ...(event?.type === "substitution"
      ? {
          substitution: {
            teamId: event.teamId,
            playerOffId: event.playerOff.playerId,
            playerOnId: event.playerOn.playerId,
          },
        }
      : {}),
    ...(event?.type === "injury"
      ? {
          injury: {
            playerId: event.player.playerId,
            teamId: event.player.teamId,
            left: !(
              state.players.find((player) => player.playerId === event.player.playerId)?.onPitch ??
              false
            ),
          },
        }
      : {}),
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
  humanTeamId?: TeamId;
  maxSteps?: number;
  broadcastStory?: BroadcastStoryContext;
  /**
   * PRD 27 — the manager's changes, replayed on the same seed: up to each request the match
   * is identical, so playback can carry on from the paused tick.
   */
  substitutions?: readonly MatchSubstitutionRequest[];
  /** From this seq on the assistant makes the human side's changes, like the AI ("simulate"). */
  assistantFromSeq?: number;
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
    humanTeamId: input.humanTeamId ?? home.team.id,
  });
  const ctx = commentaryContextFromSquads(home, away);
  const director = createBroadcastDirector({
    seed: initial.rng.seed,
    homeTeamId: home.team.id,
    story: input.broadcastStory,
  });
  const stats = emptyPairStats();
  const kickoff = frameFrom(initial, 0, undefined, stats, ctx);
  const frames: MatchViewFrame[] = [];
  const lines: MatchViewLine[] = [];
  const events: MatchEvent[] = [];
  let current = initial;
  let previousEvent: MatchEvent | undefined;
  let running = stats;
  const humanTeamId = initial.humanTeamId;
  const requests = [...(input.substitutions ?? [])].sort((a, b) => a.afterSeq - b.afterSeq);
  const ledger = substitutionLedger(initial);

  for (let i = 0; i < maxSteps; i += 1) {
    if (
      input.assistantFromSeq !== undefined &&
      current.humanTeamId !== null &&
      current.nextSeq - 1 >= input.assistantFromSeq
    ) {
      current = { ...current, humanTeamId: null };
    }
    const due = requests[0];
    const manual =
      due && humanTeamId && substitutionDue(current, due)
        ? applySubstitutionRequest(current, humanTeamId, requests.shift()!, ledger)
        : null;
    const result =
      manual ??
      step({
        state: current,
        homeTactics: current.homeTactics,
        awayTactics: current.awayTactics,
      });
    if (!manual && result.event.type === "substitution") {
      recordSubstitution(ledger, result.event.playerOff.playerId, result.event.playerOn.playerId);
    }
    current = result.state;
    events.push(result.event);
    running = applyMatchStatEvent(running, result.event, home.team.id);
    frames.push(frameFrom(current, result.event.seq, result.event, running, ctx));
    for (const line of director.emit(result.event, previousEvent, ctx)) {
      lines.push({
        seq: line.seq,
        text: line.text,
        voice: line.voice,
        beatId: line.beatId,
        level: line.level,
        storySlot: line.storySlot,
        i18nKey: line.i18nKey,
        i18nParams: line.i18nParams,
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

  const roster = [...rosterOf(home), ...rosterOf(away)];

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
    roster,
    kickoff,
    frames,
    lines,
    finalScore: current.score,
    eventCount: frames.length,
    report: buildMatchReport(events, home, away, seed, ctx),
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
