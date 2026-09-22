import type { MatchEvent, ShotOutcome } from "./match-event.ts";
import type { TeamId } from "./ids.ts";

export type MatchSideStats = {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  passes: number;
  passesComplete: number;
};

export type MatchPairStats = {
  home: MatchSideStats;
  away: MatchSideStats;
};

export function emptySideStats(): MatchSideStats {
  return {
    goals: 0,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    passes: 0,
    passesComplete: 0,
  };
}

export function emptyPairStats(): MatchPairStats {
  return { home: emptySideStats(), away: emptySideStats() };
}

export function isShotOnTarget(outcome: ShotOutcome): boolean {
  return outcome === "goal" || outcome === "save";
}

export function passCompletionPct(side: MatchSideStats): number | null {
  if (side.passes === 0) {
    return null;
  }
  return Math.round((100 * side.passesComplete) / side.passes);
}

function copyPair(stats: MatchPairStats): MatchPairStats {
  return {
    home: { ...stats.home },
    away: { ...stats.away },
  };
}

/** Fold one engine event into running home/away tallies. */
export function applyMatchStatEvent(
  stats: MatchPairStats,
  event: MatchEvent,
  homeId: TeamId,
): MatchPairStats {
  const next = copyPair(stats);
  const sideOf = (teamId: TeamId): MatchSideStats =>
    teamId === homeId ? next.home : next.away;

  if (event.type === "goal") {
    sideOf(event.scorer.teamId).goals += 1;
    return next;
  }
  if (event.type === "shot") {
    const side = sideOf(event.shooter.teamId);
    side.shots += 1;
    if (isShotOnTarget(event.outcome)) {
      side.shotsOnTarget += 1;
    }
    return next;
  }
  if (event.type === "restart" && event.phase === "corner") {
    sideOf(event.takingTeamId).corners += 1;
    return next;
  }
  if (event.type === "pass" && event.kind !== "restart") {
    const side = sideOf(event.from.teamId);
    side.passes += 1;
    if (event.complete) {
      side.passesComplete += 1;
    }
  }
  return next;
}
