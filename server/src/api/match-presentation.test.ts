import {
  asMatchId,
  asPlayerId,
  asTeamId,
  type MatchViewFrame,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import {
  applyKickoffHalfDiscipline,
  expandPresentationFrames,
  nearPostBallY,
  presentationBallForEvent,
  shotVizEndpoint,
} from "./match-presentation.ts";

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

  it("splits kickoff dots onto each half", () => {
    const frame: MatchViewFrame = {
      seq: 0,
      ball: { x: 50, y: 50 },
      score: { home: 0, away: 0 },
      possessionTeamId: asTeamId("home"),
      ballCarrierId: asPlayerId("st"),
      clock: { period: "first_half", minute: 0, second: 0, stoppageMinute: 0 },
      ballInAir: false,
      cue: null,
      stats: {
        home: {
          goals: 0,
          shots: 0,
          shotsOnTarget: 0,
          passes: 0,
          passesComplete: 0,
          corners: 0,
        },
        away: {
          goals: 0,
          shots: 0,
          shotsOnTarget: 0,
          passes: 0,
          passesComplete: 0,
          corners: 0,
        },
      },
      dots: [
        {
          playerId: asPlayerId("st"),
          teamId: asTeamId("home"),
          x: 62,
          y: 50,
        },
        {
          playerId: asPlayerId("cb"),
          teamId: asTeamId("away"),
          x: 38,
          y: 50,
        },
      ],
    };
    const next = applyKickoffHalfDiscipline(frame, asTeamId("home"));
    const home = next.dots.find((dot) => dot.teamId === asTeamId("home"))!;
    const away = next.dots.find((dot) => dot.teamId !== asTeamId("home"))!;
    expect(home.x).toBeLessThanOrEqual(49);
    expect(away.x).toBeGreaterThanOrEqual(51);
    expect(home.playerId).toBe(asPlayerId("st"));
    expect(home.x).toBe(49);
  });

  it("inserts flight frames before a shot tick", () => {
    const homeId = asTeamId("home");
    const shotFrame: MatchViewFrame = {
      seq: 5,
      ball: { x: 6, y: 48 },
      score: { home: 0, away: 0 },
      possessionTeamId: homeId,
      ballCarrierId: asPlayerId("gk"),
      clock: { period: "first_half", minute: 12, second: 0, stoppageMinute: 0 },
      ballInAir: false,
      cue: "shot",
      stats: {
        home: {
          goals: 0,
          shots: 1,
          shotsOnTarget: 1,
          passes: 0,
          passesComplete: 0,
          corners: 0,
        },
        away: {
          goals: 0,
          shots: 0,
          shotsOnTarget: 0,
          passes: 0,
          passesComplete: 0,
          corners: 0,
        },
      },
      dots: [],
    };
    const expanded = expandPresentationFrames(
      [shotFrame],
      [
        {
          type: "shot",
          seq: 5,
          matchId: asMatchId("m"),
          clock: shotFrame.clock,
          ball: shotFrame.ball,
          involved: [],
          possessionTeamId: homeId,
          shooter: {
            playerId: asPlayerId("st"),
            teamId: asTeamId("away"),
            position: { x: 82, y: 44 },
          },
          target: { x: 100, y: 50 },
          outcome: "save",
        },
      ],
      homeId,
      asTeamId("away"),
      [],
      2026,
    );
    expect(expanded).toHaveLength(1);
    expect(expanded[0]?.cue).toBe("shot");
    expect(expanded[0]?.ballInAir).toBe(true);
    expect(expanded[0]?.ball.x).toBe(6);
  });

  it("uses one driven flight frame for wide misses", () => {
    const homeId = asTeamId("home");
    const shotFrame: MatchViewFrame = {
      seq: 8,
      ball: { x: 98, y: 8 },
      score: { home: 0, away: 0 },
      possessionTeamId: homeId,
      ballCarrierId: null,
      clock: { period: "first_half", minute: 6, second: 0, stoppageMinute: 0 },
      ballInAir: true,
      cue: "shot",
      stats: {
        home: {
          goals: 0,
          shots: 2,
          shotsOnTarget: 0,
          passes: 0,
          passesComplete: 0,
          corners: 0,
        },
        away: {
          goals: 0,
          shots: 0,
          shotsOnTarget: 0,
          passes: 0,
          passesComplete: 0,
          corners: 0,
        },
      },
      dots: [],
    };
    const event = {
      type: "shot" as const,
      seq: 8,
      matchId: asMatchId("m"),
      clock: shotFrame.clock,
      ball: shotFrame.ball,
      involved: [],
      possessionTeamId: homeId,
      shooter: {
        playerId: asPlayerId("st"),
        teamId: homeId,
        position: { x: 86, y: 44 },
      },
      target: { x: 100, y: 50 },
      outcome: "wide" as const,
    };
    const end = shotVizEndpoint(event, shotFrame.ball, homeId);
    expect(end.x).toBeGreaterThan(100);
    const expanded = expandPresentationFrames(
      [shotFrame],
      [event],
      homeId,
      asTeamId("away"),
      [],
      2026,
    );
    expect(expanded).toHaveLength(1);
    expect(expanded[0]?.cue).toBe("shot");
    expect(expanded[0]?.ball.x).toBe(end.x);
  });
});
