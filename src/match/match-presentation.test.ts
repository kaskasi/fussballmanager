import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { buildMatchConditions, sandboxPlanFromFormation } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { compressGkCbRecycleFrames } from "./match-presentation.ts";

const plan = sandboxPlanFromFormation("4-4-2");

const emptyReport = {
  conditions: buildMatchConditions(1),
  goals: [],
  cards: [],
  playerStats: [],
};

function frame(
  seq: number,
  carrierId: string,
  teamId: string,
  ballX: number,
): MatchViewFrame {
  return {
    seq,
    ball: { x: ballX, y: 50 },
    score: { home: 0, away: 0 },
    possessionTeamId: teamId,
    ballCarrierId: carrierId,
    clock: { period: "first_half", minute: 1, second: 0, stoppageMinute: 0 },
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
    dots: [],
  };
}

describe("compressGkCbRecycleFrames", () => {
  it("collapses a long GK-CB recycle into two playback frames", () => {
    const view: MatchView = {
      seed: 1,
      home: { id: "home", name: "Home", shortName: "HOM", formation: "4-4-2" },
      away: { id: "away", name: "Away", shortName: "AWY", formation: "4-4-2" },
      homePlan: plan,
      awayPlan: plan,
      roster: [
        { id: "gk", teamId: "home", name: "GK", role: "GK", shirt: 1, starter: true },
        { id: "cb", teamId: "home", name: "CB", role: "CB", shirt: 4, starter: true },
      ],
      kickoff: frame(0, "gk", "home", 50),
      frames: [
        frame(1, "gk", "home", 12),
        frame(2, "cb", "home", 14),
        frame(3, "gk", "home", 12),
        frame(4, "cb", "home", 14),
        frame(5, "gk", "home", 12),
        frame(6, "st", "home", 55),
      ],
      lines: [],
      finalScore: { home: 0, away: 0 },
      eventCount: 6,
      report: emptyReport,
    };
    const compressed = compressGkCbRecycleFrames(view);
    expect(compressed.frames.length).toBeLessThan(view.frames.length);
    expect(compressed.frames[0]?.seq).toBe(1);
    expect(compressed.frames.at(-1)?.ballCarrierId).toBe("st");
  });

  it("leaves ordinary play untouched", () => {
    const view: MatchView = {
      seed: 1,
      home: { id: "home", name: "Home", shortName: "HOM", formation: "4-4-2" },
      away: { id: "away", name: "Away", shortName: "AWY", formation: "4-4-2" },
      homePlan: plan,
      awayPlan: plan,
      roster: [
        { id: "cm", teamId: "home", name: "CM", role: "CM", shirt: 8, starter: true },
      ],
      kickoff: frame(0, "cm", "home", 50),
      frames: [frame(1, "cm", "home", 55), frame(2, "cm", "home", 60)],
      lines: [],
      finalScore: { home: 0, away: 0 },
      eventCount: 2,
      report: emptyReport,
    };
    expect(compressGkCbRecycleFrames(view).frames).toHaveLength(2);
  });
});
