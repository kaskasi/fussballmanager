import { asMatchId, asPlayerId, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { nearPostBallY, presentationBallForEvent } from "./match-presentation.ts";

describe("match presentation", () => {
  it("places wide misses near the post instead of the corner", () => {
    expect(nearPostBallY(40)).toBe(36);
    expect(nearPostBallY(60)).toBe(64);
  });

  it("rewrites shot frame ball position for wide outcomes", () => {
    const ball = presentationBallForEvent(
      {
        type: "shot",
        seq: 1,
        matchId: asMatchId("m1"),
        clock: { period: "first_half", minute: 10, second: 0, stoppageMinute: 0 },
        ball: { x: 98, y: 4 },
        involved: [],
        possessionTeamId: asTeamId("home"),
        shooter: {
          playerId: asPlayerId("st"),
          teamId: asTeamId("home"),
          position: { x: 88, y: 42 },
        },
        target: { x: 100, y: 50 },
        outcome: "wide",
      },
      { x: 98, y: 4 },
    );
    expect(ball.y).toBeGreaterThan(30);
    expect(ball.y).toBeLessThan(45);
    expect(ball.x).toBe(98);
  });
});
