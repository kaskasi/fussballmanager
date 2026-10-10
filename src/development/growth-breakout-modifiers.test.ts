import { describe, expect, it } from "vitest";
import {
  aggregateWeeklyGrowthMultiplier,
  attributeGroupGrowthBias,
} from "./growth-breakout-modifiers.ts";

describe("growth breakout modifiers", () => {
  it("multiplies active weekly_growth_multiplier modifiers", () => {
    const product = aggregateWeeklyGrowthMultiplier(
      [
        { source_event_id: "a", weekly_growth_multiplier: 2, until_week: 20 },
        { source_event_id: "b", weekly_growth_multiplier: 0.5, until_week: 5 },
      ],
      10,
      false,
    );
    expect(product).toBe(2);
  });

  it("applies attribute group bias only on matching skills", () => {
    const mods = [
      {
        source_event_id: "tech",
        attribute_group: "technical" as const,
        weekly_growth_multiplier: 1.5,
        until_week: 30,
      },
    ];
    expect(attributeGroupGrowthBias(mods, 10, false, "shooting")).toBe(1.5);
    expect(attributeGroupGrowthBias(mods, 10, false, "pace")).toBe(1);
  });
});
