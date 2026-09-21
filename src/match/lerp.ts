import type { MatchViewDot, MatchViewFrame, PitchPosition } from "@fussballmanager/shared";

/** Skip blending across restarts/subs; walk there instead of sliding the pitch. */
const SNAP_DISTANCE = 32;

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function frameDurationMs(speed: number): number {
  const rate = Math.min(32, Math.max(1, speed));
  return Math.max(8, Math.round(280 / rate));
}

export function lerpPosition(
  from: PitchPosition,
  to: PitchPosition,
  t: number,
): PitchPosition {
  if (Math.hypot(to.x - from.x, to.y - from.y) > SNAP_DISTANCE) {
    return to;
  }
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
}

export function mixDot(
  from: MatchViewDot | undefined,
  to: MatchViewDot,
  t: number,
): MatchViewDot {
  if (!from) {
    return to;
  }
  const position = lerpPosition(from, to, t);
  return { ...to, x: position.x, y: position.y };
}

export type DisplayedPose = {
  dots: MatchViewDot[];
  ball: PitchPosition;
  /** 0 on the grass, 1 in the air — from `ballInAir`, not a second sim. */
  ballLift: number;
};

export function mixFrame(
  from: MatchViewFrame,
  to: MatchViewFrame,
  t: number,
): DisplayedPose {
  const clamped = Math.min(1, Math.max(0, t));
  const previous = new Map(from.dots.map((dot) => [dot.playerId, dot]));
  return {
    dots: to.dots.map((dot) => mixDot(previous.get(dot.playerId), dot, clamped)),
    ball: lerpPosition(from.ball, to.ball, clamped),
    ballLift: lerp(from.ballInAir ? 1 : 0, to.ballInAir ? 1 : 0, clamped),
  };
}
