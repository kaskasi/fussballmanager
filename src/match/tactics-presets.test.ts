import { describe, expect, it } from "vitest";
import { sandboxPlanFromFormation } from "@fussballmanager/shared";
import {
  defaultTacticsPresets,
  loadTacticsPreset,
  saveTacticsPreset,
} from "./tactics-presets.ts";

describe("tactics presets", () => {
  it("ships three default slots", () => {
    const presets = defaultTacticsPresets();
    expect(presets).toHaveLength(3);
    expect(presets.map((slot) => slot.plan.formation)).toEqual(["4-3-3", "4-4-2", "2-3-5"]);
  });

  it("saves and loads a preset plan", () => {
    const custom = sandboxPlanFromFormation("4-4-2");
    custom.pressing = 88;
    const saved = saveTacticsPreset(defaultTacticsPresets(), 2, custom);
    const loaded = loadTacticsPreset(saved, 2);
    expect(loaded.formation).toBe("4-4-2");
    expect(loaded.pressing).toBe(88);
  });
});
