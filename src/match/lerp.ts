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
  snapFar = true,
): PitchPosition {
  if (snapFar && Math.hypot(to.x - from.x, to.y - from.y) > SNAP_DISTANCE) {
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

const CARRY_FORWARD = 2.55;
const CARRY_SIDE = 1.35;

function clampPitch(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Viz only: at the feet, not through the badge. GK keeps it in the hands. */
export function holdPoint(
  frame: MatchViewFrame,
  homeId: string,
  roleOf: (playerId: string) => string | undefined,
): PitchPosition {
  if (frame.ballInAir || !frame.ballCarrierId) {
    return frame.ball;
  }
  const carrier = frame.dots.find((dot) => dot.playerId === frame.ballCarrierId);
  if (!carrier) {
    return frame.ball;
  }
  if (roleOf(carrier.playerId) === "GK") {
    return { x: carrier.x, y: carrier.y };
  }
  const attack = carrier.teamId === homeId ? 1 : -1;
  const side = carrier.y >= 50 ? 1 : -1;
  return {
    x: clampPitch(carrier.x + attack * CARRY_FORWARD),
    y: clampPitch(carrier.y + side * CARRY_SIDE),
  };
}

export function mixFrame(
  from: MatchViewFrame,
  to: MatchViewFrame,
  t: number,
  homeId?: string,
  roleOf?: (playerId: string) => string | undefined,
): DisplayedPose {
  const clamped = Math.min(1, Math.max(0, t));
  const previous = new Map(from.dots.map((dot) => [dot.playerId, dot]));
  const resolve = roleOf ?? (() => undefined);
  const home = homeId ?? "";
  return {
    dots: to.dots.map((dot) => mixDot(previous.get(dot.playerId), dot, clamped)),
    ball: lerpPosition(
      holdPoint(from, home, resolve),
      holdPoint(to, home, resolve),
      clamped,
      false,
    ),
    ballLift: lerp(from.ballInAir ? 1 : 0, to.ballInAir ? 1 : 0, clamped),
  };
}
