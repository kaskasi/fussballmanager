import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { HUB_PLAN, applyTrainingUnit, isolatedUnitSessions } from "./pipeline-week.ts";
import { focusSlotsFor } from "./weekly-plan.ts";

describe("applyTrainingUnit", () => {
  it("isolates focus to the active slot only", () => {
    const isolated = isolatedUnitSessions(HUB_PLAN, 0);
    expect(focusSlotsFor(isolated, "passing")).toBe(1);
    expect(focusSlotsFor(isolated, "pace")).toBe(0);
  });

  it("changes attributes for a configured slot", () => {
    const player = clonePlayer();
    const next = applyTrainingUnit(player, HUB_PLAN, 0, { season: 1, week: 1, masterSeed: 1 });
    expect(next.attributes.passing).toBeGreaterThan(player.attributes.passing);
  });
});
