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

/** Driven shots leave the foot fast, then settle at the target. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

function ballRenderPoint(
  frame: MatchViewFrame,
  homeId: string,
  roleOf: (playerId: string) => string | undefined,
): PitchPosition {
  if (frame.cue === "shot") {
    return frame.ball;
  }
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
  const shotRelease = to.cue === "shot" && from.cue !== "shot";
  if (shotRelease) {
    const distScale = Math.min(1.15, 0.75 + dist / 55);
    return Math.round(base * 0.36 * distScale);
  }
  if (from.cue === "shot" && to.cue !== "shot") {
    return Math.max(8, Math.round(base * 0.14));
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
  snapFar = true,
): MatchViewDot {
  if (!from) {
    return to;
  }
  const position = lerpPosition(from, to, t, snapFar);
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
  const leavingShot = from.cue === "shot" && to.cue !== "shot";
  const ballT = drivenShot ? easeOutCubic(clamped) : inAir ? easeInOut(clamped) : clamped;
  const fromBall =
    drivenShot && !from.ballInAir && from.cue !== "shot"
      ? holdPoint(from, home, resolve)
      : ballRenderPoint(from, home, resolve);
  const toBall = ballRenderPoint(to, home, resolve);
  const liftT = drivenShot
    ? Math.sin(Math.PI * clamped)
    : easeInOut(clamped);
  const snapDots = !(drivenShot || inAir);
  return {
    dots: to.dots.map((dot) => mixDot(previous.get(dot.playerId), dot, clamped, snapDots)),
    ball: leavingShot ? toBall : lerpPosition(fromBall, toBall, ballT, false),
    ballLift: drivenShot
      ? liftT
      : leavingShot
        ? to.ballInAir
          ? 1
          : 0
        : lerp(from.ballInAir ? 1 : 0, to.ballInAir ? 1 : 0, liftT),
  };
}
