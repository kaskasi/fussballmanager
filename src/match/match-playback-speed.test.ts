import { describe, expect, it } from "vitest";
import { clampCareerMatchSpeed } from "./match-playback-speed.ts";

describe("clampCareerMatchSpeed", () => {
  it("snaps to 1, 2, or 4", () => {
    expect(clampCareerMatchSpeed(0)).toBe(1);
    expect(clampCareerMatchSpeed(1)).toBe(1);
    expect(clampCareerMatchSpeed(2)).toBe(2);
    expect(clampCareerMatchSpeed(3)).toBe(4);
    expect(clampCareerMatchSpeed(8)).toBe(4);
  });
});
