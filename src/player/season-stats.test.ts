import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  careerSeasonStats,
  careerSeasonStatsForSeason,
  listCareerStatSeasons,
} from "./season-stats.ts";
import { appendSeasonSnapshot } from "../ui/player-profile.ts";

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

  it("only lists stat seasons with archive rows or the current career season", () => {
    const player = clonePlayer();
    player.age = 28;
    expect(listCareerStatSeasons(player, 1)).toEqual([1]);
  });

  it("lists current and archived seasons for year pills", () => {
    const player = appendSeasonSnapshot(
      { ...clonePlayer(), state: { ...clonePlayer().state, season_minutes: 720 } },
      1,
    );
    player.state.season_minutes = 120;
    expect(listCareerStatSeasons(player, 2)).toEqual([1, 2]);
    const archived = careerSeasonStatsForSeason(player, 1, 2, true);
    expect(archived?.minutes).toBeGreaterThan(0);
    expect(archived?.rating).toBe("—");
  });
});
