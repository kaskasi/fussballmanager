import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyTrainingWeek, HUB_PLAN, projectWeek } from "./pipeline-week.ts";

describe("pipeline week", () => {
  it("projects the age-19 passing gain from two technical focus sessions", () => {
    const player = clonePlayer();
    const passing = 1.5 * 1.1 * 1 * 1.5 * 0.7;
    const next = applyTrainingWeek(player, HUB_PLAN);
    expect(next.attributes.passing - player.attributes.passing).toBeCloseTo(passing, 5);
    expect(projectWeek(player, HUB_PLAN)).toBeGreaterThan(passing);
    expect(projectWeek(next, HUB_PLAN)).toBeCloseTo(projectWeek(player, HUB_PLAN), 5);
  });
});
