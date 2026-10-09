import type { MatchViewDot, MatchViewFrame, PitchPosition } from "@fussballmanager/shared";

/** Skip blending across restarts/subs; walk there instead of sliding the pitch. */
const SNAP_DISTANCE = 32;

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function easeInOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped < 0.5
    ? 2 * clamped * clamped
    : 1 - (-2 * clamped + 2) ** 2 / 2;
}

/** Accelerate into the goal on driven shots. */
export function easeIn(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped;
}

function ballRenderPoint(
  frame: MatchViewFrame,
  homeId: string,
  roleOf: (playerId: string) => string | undefined,
): PitchPosition {
  if (frame.ballInAir || !frame.ballCarrierId) {
    return frame.ball;
  }
  return holdPoint(frame, homeId, roleOf);
}

export function frameDurationMs(speed: number): number {
  const rate = Math.min(32, Math.max(1, speed));
  return Math.max(8, Math.round(280 / rate));
}

const BALL_FLIGHT_DISTANCE = 22;
const BALL_OUT_DISTANCE = 38;

export function transitionDurationMs(
  from: MatchViewFrame,
  to: MatchViewFrame,
  homeId: string,
  roleOf: (playerId: string) => string | undefined,
  speed: number,
): number {
  const base = frameDurationMs(speed);
  const fromBall = ballRenderPoint(from, homeId, roleOf);
  const toBall = ballRenderPoint(to, homeId, roleOf);
  const dist = Math.hypot(toBall.x - fromBall.x, toBall.y - fromBall.y);
  const inAir = from.ballInAir || to.ballInAir;
  const shotRelease = to.cue === "shot" && !from.ballInAir;
  const inShotArc = from.ballInAir && to.cue === "shot";
  if (shotRelease || inShotArc) {
    return Math.round(base * (shotRelease ? 0.52 : 0.65));
  }
  if (inAir && dist > BALL_FLIGHT_DISTANCE) {
    return Math.round(base * (dist > BALL_OUT_DISTANCE ? 2.8 : 1.35));
  }
  if (dist > BALL_OUT_DISTANCE) {
    return Math.round(base * 2.4);
  }
  return base;
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
  const inAir = from.ballInAir || to.ballInAir;
  const drivenShot = to.cue === "shot";
  const ballT = drivenShot ? easeIn(clamped) : inAir ? easeInOut(clamped) : clamped;
  const fromBall = ballRenderPoint(from, home, resolve);
  const toBall = ballRenderPoint(to, home, resolve);
  const liftT = drivenShot ? easeIn(clamped) : easeInOut(clamped);
  return {
    dots: to.dots.map((dot) => mixDot(previous.get(dot.playerId), dot, clamped)),
    ball: lerpPosition(fromBall, toBall, ballT, false),
    ballLift: drivenShot
      ? liftT
      : lerp(from.ballInAir ? 1 : 0, to.ballInAir ? 1 : 0, liftT),
  };
}
