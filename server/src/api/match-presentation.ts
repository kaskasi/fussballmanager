import type {
  MatchEvent,
  MatchViewDot,
  MatchViewFrame,
  MatchViewRosterPlayer,
  PitchPosition,
  PlayerRole,
  TeamId,
} from "@fussballmanager/shared";

/** Mouth centre-line used for near-post presentation correction. */
const GOAL_MOUTH_Y = 50;
const NEAR_POST_OFFSET = 14;

const HOME_HALF_MAX = 49;
const AWAY_HALF_MIN = 51;
const KICKOFF_CENTER = { x: 50, y: 50 };

function clampY(y: number): number {
  return Math.min(96, Math.max(4, y));
}

function clampPitch(position: PitchPosition): PitchPosition {
  return {
    x: Math.min(100, Math.max(0, position.x)),
    y: Math.min(100, Math.max(0, position.y)),
  };
}

function lerpPos(from: PitchPosition, to: PitchPosition, t: number): PitchPosition {
  return clampPitch({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  });
}

export function vizUnit(seed: number, seq: number, salt: string): number {
  let hash = seed ^ seq;
  for (let index = 0; index < salt.length; index += 1) {
    hash = Math.imul(hash ^ salt.charCodeAt(index), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

/**
 * Wide/woodwork misses are simulated toward the corners; for pitch replay we
 * nudge the displayed ball toward the near post (wrapper layer — engine untouched).
 */
export function nearPostBallY(shooterY: number, mouthY = GOAL_MOUTH_Y): number {
  return clampY(shooterY <= mouthY ? mouthY - NEAR_POST_OFFSET : mouthY + NEAR_POST_OFFSET);
}

export function presentationBallForEvent(
  event: MatchEvent | undefined,
  ball: PitchPosition,
): PitchPosition {
  if (
    event?.type === "shot" &&
    (event.outcome === "wide" || event.outcome === "woodwork")
  ) {
    return {
      x: ball.x,
      y: nearPostBallY(event.shooter.position.y),
    };
  }
  return ball;
}

export function applyFramePresentation(
  frame: MatchViewFrame,
  event: MatchEvent | undefined,
): MatchViewFrame {
  const ball = presentationBallForEvent(event, frame.ball);
  if (ball.x === frame.ball.x && ball.y === frame.ball.y) {
    return frame;
  }
  return { ...frame, ball };
}

function goalMouth(homeTeamId: TeamId, attackTeamId: TeamId): PitchPosition {
  return { x: attackTeamId === homeTeamId ? 100 : 0, y: 50 };
}

function bylineMissSpot(mouth: PitchPosition, shooterY: number): PitchPosition {
  return {
    x: mouth.x >= 50 ? 102 : -2,
    y: clampY(50 + (shooterY - 50) * 1.2),
  };
}

/** One-shot flight endpoint for misses (wide / woodwork) — no second hop. */
export function shotVizEndpoint(
  event: Extract<MatchEvent, { type: "shot" }>,
  frameBall: PitchPosition,
  homeTeamId: TeamId,
): PitchPosition {
  const mouth = goalMouth(homeTeamId, event.shooter.teamId);
  if (event.outcome === "woodwork") {
    return {
      x: mouth.x >= 50 ? 99.4 : 0.6,
      y: clampY(event.target.y),
    };
  }
  if (event.outcome === "wide") {
    return bylineMissSpot(mouth, event.shooter.position.y);
  }
  return frameBall;
}

function withBall(
  frame: MatchViewFrame,
  ball: PitchPosition,
  patch?: { ballInAir?: boolean; ballCarrierId?: string | null; cue?: MatchViewFrame["cue"] },
): MatchViewFrame {
  return {
    ...frame,
    ball,
    ballInAir: patch?.ballInAir ?? frame.ballInAir,
    ballCarrierId:
      patch?.ballCarrierId !== undefined ? patch.ballCarrierId : frame.ballCarrierId,
    cue: patch?.cue !== undefined ? patch.cue : frame.cue,
  };
}

function isOutRestart(event: MatchEvent | undefined): boolean {
  return (
    event?.type === "restart" &&
    (event.phase === "throw_in" || event.phase === "goal_kick" || event.phase === "corner")
  );
}

function insertShotFlightFrames(
  out: MatchViewFrame[],
  frame: MatchViewFrame,
  event: Extract<MatchEvent, { type: "shot" }>,
  seed: number,
  nextEvent: MatchEvent | undefined,
  homeTeamId: TeamId,
): void {
  const endBall =
    event.outcome === "wide" || event.outcome === "woodwork"
      ? shotVizEndpoint(event, frame.ball, homeTeamId)
      : frame.ball;

  // One flight tick — client easeOut from feet → `endBall` (no mid-waypoints).
  out.push(
    withBall(frame, endBall, {
      ballInAir: true,
      ballCarrierId: null,
      cue: "shot",
    }),
  );

  if (event.outcome === "wide" || event.outcome === "woodwork") {
    return;
  }

  if (event.outcome === "save") {
    const holdChance = vizUnit(seed, event.seq, "viz-save-hold");
    if (holdChance < 0.28) {
      out.push(
        withBall(frame, endBall, {
          ballInAir: false,
          ballCarrierId: frame.ballCarrierId,
          cue: null,
        }),
      );
    }
    if (isOutRestart(nextEvent)) {
      const mouth = goalMouth(homeTeamId, event.shooter.teamId);
      const outSpot = bylineMissSpot(mouth, event.shooter.position.y);
      out.push(
        withBall(frame, outSpot, {
          ballInAir: true,
          ballCarrierId: null,
          cue: null,
        }),
      );
    }
    return;
  }

}

function kickoffKickerId(frame: MatchViewFrame): string | null {
  return frame.ballCarrierId;
}

/** Presentation-only: keep each team on its half at kickoff. */
export function applyKickoffHalfDiscipline(
  frame: MatchViewFrame,
  homeTeamId: TeamId,
): MatchViewFrame {
  const kickerId = kickoffKickerId(frame);
  const dots = frame.dots.map((dot) => {
    if (dot.playerId === kickerId) {
      return {
        ...dot,
        x: dot.teamId === homeTeamId ? HOME_HALF_MAX : AWAY_HALF_MIN,
        y: KICKOFF_CENTER.y,
      };
    }
    if (dot.teamId === homeTeamId) {
      return { ...dot, x: Math.min(dot.x, HOME_HALF_MAX) };
    }
    return { ...dot, x: Math.max(dot.x, AWAY_HALF_MIN) };
  });
  return { ...frame, dots };
}

const SETPIECE_ROLES = new Set<PlayerRole>(["CB", "FB", "DM", "ST"]);

function nudgeToward(dot: MatchViewDot, target: PitchPosition, weight: number): MatchViewDot {
  return {
    ...dot,
    x: dot.x + (target.x - dot.x) * weight,
    y: dot.y + (target.y - dot.y) * weight,
  };
}

function cornerSetPieceTargets(
  homeTeamId: TeamId,
  takingTeamId: TeamId,
  seed: number,
  seq: number,
): { attack: PitchPosition; defend: PitchPosition } {
  const homeAttacks = takingTeamId === homeTeamId;
  const jitter = vizUnit(seed, seq, "corner-y") * 12 - 6;
  if (homeAttacks) {
    return {
      attack: { x: 92, y: clampY(50 + jitter) },
      defend: { x: 90, y: clampY(50 + jitter * 0.6) },
    };
  }
  return {
    attack: { x: 8, y: clampY(50 + jitter) },
    defend: { x: 10, y: clampY(50 + jitter * 0.6) },
  };
}

export function nudgeCornerSetPieceDots(
  frame: MatchViewFrame,
  event: MatchEvent,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  roster: readonly MatchViewRosterPlayer[],
  seed: number,
): MatchViewFrame {
  if (event.type !== "restart" || event.phase !== "corner") {
    return frame;
  }
  const roleById = new Map(roster.map((entry) => [entry.id, entry.role]));
  const takingTeamId = event.takingTeamId;
  const defendingTeamId = takingTeamId === homeTeamId ? awayTeamId : homeTeamId;

  const targets = cornerSetPieceTargets(homeTeamId, takingTeamId, seed, event.seq);
  const takerId = frame.ballCarrierId;
  let attackCount = 0;
  let defendCount = 0;

  const dots = frame.dots.map((dot) => {
    if (dot.playerId === takerId) {
      return dot;
    }
    const role = roleById.get(dot.playerId);
    if (!role || !SETPIECE_ROLES.has(role)) {
      return dot;
    }
    if (dot.teamId === takingTeamId && attackCount < 3) {
      attackCount += 1;
      const w = 0.55 + vizUnit(seed, event.seq, `corner-a-${attackCount}`) * 0.25;
      return nudgeToward(dot, targets.attack, w);
    }
    if (dot.teamId === defendingTeamId && defendCount < 6) {
      defendCount += 1;
      const w = 0.5 + vizUnit(seed, event.seq, `corner-d-${defendCount}`) * 0.3;
      return nudgeToward(dot, targets.defend, w);
    }
    return dot;
  });

  return { ...frame, dots };
}

export function expandPresentationFrames(
  frames: MatchViewFrame[],
  events: MatchEvent[],
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  roster: readonly MatchViewRosterPlayer[],
  seed: number,
): MatchViewFrame[] {
  const out: MatchViewFrame[] = [];

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index]!;
    const event = events[index]!;
    const nextEvent = events[index + 1];

    if (event.type === "shot") {
      insertShotFlightFrames(out, frame, event, seed, nextEvent, homeTeamId);
      continue;
    }

    let presented = frame;

    if (event.type === "restart" && event.phase === "kickoff") {
      presented = applyKickoffHalfDiscipline(presented, homeTeamId);
    }

    if (event.type === "restart" && event.phase === "corner") {
      presented = nudgeCornerSetPieceDots(
        presented,
        event,
        homeTeamId,
        awayTeamId,
        roster,
        seed,
      );
    }

    out.push(presented);
  }

  return out;
}
