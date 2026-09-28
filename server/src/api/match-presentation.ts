import type { MatchEvent, MatchViewFrame, PitchPosition } from "@fussballmanager/shared";

/** Mouth centre-line used for near-post presentation correction. */
const GOAL_MOUTH_Y = 50;
const NEAR_POST_OFFSET = 14;

function clampY(y: number): number {
  return Math.min(96, Math.max(4, y));
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
