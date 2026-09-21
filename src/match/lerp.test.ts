import { describe, expect, it } from "vitest";
import type { MatchViewFrame } from "@fussballmanager/shared";
import { frameDurationMs, lerp, mixDot, mixFrame } from "./lerp";

const baseFrame = (): MatchViewFrame => ({
  seq: 1,
  ball: { x: 50, y: 50 },
  score: { home: 0, away: 0 },
  possessionTeamId: null,
  ballCarrierId: null,
  clock: { minute: 0, second: 0, period: "first_half", stoppageMinute: 0 },
  dots: [],
  ballInAir: false,
});

describe("pitch lerp", () => {
  it("blends last position into the current event, not a new sim", () => {
    const from = mixDot(undefined, {
      playerId: "nord-9",
      teamId: "fc-nordstern",
      x: 10,
      y: 10,
    }, 1);
    const mid = mixDot(from, { ...from, x: 20, y: 30 }, 0.5);
    expect(mid.x).toBe(15);
    expect(mid.y).toBe(20);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it("snaps instead of sliding across the pitch on a restart", () => {
    const from = {
      playerId: "nord-9",
      teamId: "fc-nordstern",
      x: 10,
      y: 10,
    };
    const to = { ...from, x: 90, y: 90 };
    expect(mixDot(from, to, 0.5)).toEqual(to);
  });

  it("lifts the ball from ballInAir on the frame, and matches playback delay", () => {
    const from = {
      ...baseFrame(),
      ball: { x: 40, y: 40 },
      ballInAir: false,
    };
    const to = {
      ...baseFrame(),
      seq: 2,
      ball: { x: 60, y: 40 },
      ballInAir: true,
    };
    const mid = mixFrame(from, to, 0.5);
    expect(mid.ball.x).toBe(50);
    expect(mid.ballLift).toBe(0.5);
    expect(frameDurationMs(1)).toBe(280);
    expect(frameDurationMs(4)).toBe(70);
    expect(frameDurationMs(32)).toBe(9);
  });
});
