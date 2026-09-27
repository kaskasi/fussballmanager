import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultClubFinances } from "../economy/club-finances.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { defaultBoardState } from "./board-state.ts";
import {
  evaluateSeasonObjectives,
  generateSeasonObjectives,
  objectiveProgress,
  startBoardSeason,
} from "./season-objectives.ts";

describe("season objectives", () => {
  it("generates three board targets", () => {
    const objectives = generateSeasonObjectives(NORDSTERN_ID, 1);
    expect(objectives).toHaveLength(3);
    expect(objectives.map((entry) => entry.kind)).toEqual([
      "league_place_max",
      "min_points",
      "min_cash",
    ]);
  });

  it("dismisses the manager when fewer than two goals are met", () => {
    const board = startBoardSeason(defaultBoardState(), NORDSTERN_ID, 1);
    const league = { ...defaultLeagueState(), season_complete: true };
    const finances = { ...defaultClubFinances(), cash: 1_000_000 };
    const result = evaluateSeasonObjectives(board, league, finances, 1);
    expect(result.evaluation.dismissed).toBe(true);
    expect(result.board.job_status).toBe("dismissed");
  });

  it("tracks league place progress", () => {
    const board = startBoardSeason(defaultBoardState(), NORDSTERN_ID, 1);
    const placeObjective = board.objectives.find((entry) => entry.id === "league_place")!;
    const progress = objectiveProgress(placeObjective, defaultLeagueState(), defaultClubFinances());
    expect(progress.current).toBeGreaterThan(0);
  });
});
