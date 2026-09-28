import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { defaultBoardState } from "../board/board-state.ts";
import { defaultClubStadium } from "../stadium/club-stadium.ts";
import { defaultStoryState } from "./story-state.ts";
import { detectWeeklyBeats } from "./detect.ts";
import { legacyWorldState } from "../world/world-generator.ts";

describe("detectWeeklyBeats", () => {
  it("does not fire beats before opening is complete", () => {
    const beats = detectWeeklyBeats({
      story: { ...defaultStoryState(1), opening_complete: false },
      league: defaultLeagueState(),
      board: defaultBoardState(),
      stadium: defaultClubStadium(),
      players: [],
      clubId: "cl_fc_nordstern",
      season: 1,
      week: 1,
      masterSeed: 42,
      world: legacyWorldState(42),
      playerFixture: null,
    });
    expect(beats).toHaveLength(0);
  });

  it("fires board survival intro in early weeks", () => {
    const beats = detectWeeklyBeats({
      story: { ...defaultStoryState(1), opening_complete: true },
      league: defaultLeagueState(),
      board: defaultBoardState(),
      stadium: defaultClubStadium(),
      players: [],
      clubId: "cl_fc_nordstern",
      season: 1,
      week: 1,
      masterSeed: 42,
      world: legacyWorldState(42),
      playerFixture: null,
    });
    expect(beats.some((beat) => beat.beatId === "board_survival_intro")).toBe(true);
  });
});
