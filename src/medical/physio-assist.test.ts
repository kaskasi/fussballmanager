import { describe, expect, it } from "vitest";
import { physioAssistMinigame, xrayLampAligned } from "./physio-assist.ts";

describe("physioAssistMinigame", () => {
  it("is stable for the same inputs", () => {
    const a = physioAssistMinigame(99, 1, 3, "p-1");
    const b = physioAssistMinigame(99, 1, 3, "p-1");
    expect(a).toBe(b);
    expect(["xray_slide", "rehab_timing"]).toContain(a);
  });

  it("mixes variants across players", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i++) {
      kinds.add(physioAssistMinigame(7, 1, 5, `player-${i}`));
    }
    expect(kinds.size).toBe(2);
  });
});

describe("xrayLampAligned", () => {
  it("accepts within threshold", () => {
    expect(xrayLampAligned(50, 53)).toBe(true);
    expect(xrayLampAligned(50, 44)).toBe(false);
  });
});
