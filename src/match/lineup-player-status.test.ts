import { describe, expect, it } from "vitest";
import {
  careerFormToLineupScale,
  lineupFatigueFromFitness,
  lineupFormFromCareer,
} from "./lineup-player-status.ts";

describe("lineup-player-status", () => {
  it("maps career form to 4–10 with 7.0 average", () => {
    expect(careerFormToLineupScale(0)).toBe(7);
    expect(careerFormToLineupScale(4)).toBe(10);
    expect(careerFormToLineupScale(-4)).toBe(4);
  });

  it("labels form for UI", () => {
    expect(lineupFormFromCareer(0).label).toBe("7.0");
    expect(lineupFormFromCareer(4).label).toBe("10.0");
  });

  it("maps fitness to 0–5 fatigue bars", () => {
    expect(lineupFatigueFromFitness(100).filled).toBe(5);
    expect(lineupFatigueFromFitness(55).filled).toBe(3);
    expect(lineupFatigueFromFitness(5).filled).toBe(0);
    expect(lineupFatigueFromFitness(5).tone).toBe("empty");
  });
});
