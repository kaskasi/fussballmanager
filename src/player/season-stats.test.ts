import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { careerSeasonStats } from "./season-stats.ts";

describe("career season stats", () => {
  it("uses tracked season minutes", () => {
    const player = clonePlayer();
    player.state.season_minutes = 540;
    const stats = careerSeasonStats(player, true);
    expect(stats?.minutes).toBe(540);
    expect(stats?.apps).toBeGreaterThan(0);
    expect(stats?.rating).not.toBe("—");
  });

  it("shows zeroed line for pros without minutes yet", () => {
    const player = clonePlayer();
    const stats = careerSeasonStats(player, true);
    expect(stats?.minutes).toBe(0);
    expect(stats?.rating).toBe("—");
  });
});
