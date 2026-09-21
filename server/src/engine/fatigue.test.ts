import { describe, expect, it } from "vitest";
import { fatigueGain } from "./fatigue.ts";

describe("fatigueGain", () => {
  const base = {
    seconds: 10,
    pressing: 50,
    stamina: 70,
    defending: true,
  };

  it("burns more at 120 intensity than at 90, and more after the 60th minute", () => {
    const cruise = fatigueGain({ ...base, intensity: 90, minute: 20 });
    const redline = fatigueGain({ ...base, intensity: 120, minute: 20 });
    const late = fatigueGain({ ...base, intensity: 120, minute: 75 });
    expect(redline).toBeGreaterThan(cruise);
    expect(late).toBeGreaterThan(redline);
  });
});
