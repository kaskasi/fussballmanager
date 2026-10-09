import { describe, expect, it } from "vitest";
import { sandboxPlanFromFormation } from "@fussballmanager/shared";
import {
  COMPACT_OFFLINE_LATTICE,
  DEFAULT_OFFLINE_LATTICE,
  enumerateTacticPlans,
  latticePlanCount,
} from "./opponent-scout-lattice.ts";

describe("opponent scout tactic lattice", () => {
  it("counts 875 plans for default offline grid (7 formations × 5³)", () => {
    expect(latticePlanCount(DEFAULT_OFFLINE_LATTICE)).toBe(875);
    const plans = enumerateTacticPlans(sandboxPlanFromFormation("4-3-3"), COMPACT_OFFLINE_LATTICE);
    expect(plans).toHaveLength(latticePlanCount(COMPACT_OFFLINE_LATTICE));
    expect(plans[0]?.planId).toMatch(/^4-3-3_m/);
  });
});
