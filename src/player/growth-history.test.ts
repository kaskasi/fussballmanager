import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyTrainingWeek, HUB_PLAN } from "../development/pipeline-week.ts";
import {
  formatGrowthDelta,
  netWeeklyAttributeGrowth,
  stampWeeklyGrowthBatch,
  stampWeeklyGrowthTracking,
  weeklyGrowthSoFar,
  weeklyGrowthDelta,
} from "./growth-history.ts";

describe("growth history", () => {
  it("tracks signed net growth separately from positive-only rolling sum", () => {
    const player = clonePlayer();
    player.attributes.pace = 130;
    player.age = 33;
    const trained = applyTrainingWeek(player, HUB_PLAN);
    const stamped = stampWeeklyGrowthTracking(player, trained);

    expect(stamped.state.last_week_growth).toBe(
      netWeeklyAttributeGrowth(player.attributes, trained.attributes),
    );
    expect(stamped.state.recent_growth_26w).toBeGreaterThanOrEqual(0);
    expect(weeklyGrowthDelta(stamped)).toBe(stamped.state.last_week_growth);
  });

  it("stamps growth for players present at week start", () => {
    const player = clonePlayer();
    const trained = applyTrainingWeek(player, HUB_PLAN);
    const stamped = stampWeeklyGrowthBatch([player], [trained])[0];
    expect(stamped).toBeDefined();

    expect(stamped!.state.last_week_growth).not.toBeUndefined();
    expect(weeklyGrowthDelta(stamped!)).toBeGreaterThan(0);
  });

  it("reads net growth since week-start baseline", () => {
    const player = clonePlayer();
    const baseline = { ...player.attributes };
    player.attributes.passing += 0.12;
    player.attributes.pace -= 0.05;
    player.state.week_start_attributes = baseline;
    player.state.week_start_key = { season: 1, week: 4 };
    expect(weeklyGrowthSoFar(player, 1, 4)).toBeCloseTo(0.07, 5);
    expect(weeklyGrowthSoFar(player, 1, 5)).toBeNull();
  });

  it("formats growth deltas for heatmap tooltips", () => {
    expect(formatGrowthDelta(null)).toBe("—");
    expect(formatGrowthDelta(2.4)).toBe("+2.4");
    expect(formatGrowthDelta(-0.3)).toBe("-0.3");
    expect(formatGrowthDelta(0)).toBe("0");
  });
});
