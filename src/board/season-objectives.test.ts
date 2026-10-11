import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultClubFinances } from "../economy/club-finances.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { defaultBoardState } from "./board-state.ts";
import {
  evaluateSeasonObjectives,
  generateSeasonObjectives,
  objectiveProgress,
  startBoardSeason,
} from "./season-objectives.ts";
import { SURVIVAL_TARGET_PLACE } from "../narrative/season-objectives.ts";

describe("season objectives", () => {
  it("generates tier-based board targets", () => {
    const league = defaultLeagueState();
    const objectives = generateSeasonObjectives(NORDSTERN_ID, 1, league, { avg_ca: 70 });
    expect(objectives.length).toBeGreaterThanOrEqual(3);
    expect(objectives.some((entry) => entry.mandatory)).toBe(true);
    expect(objectives.some((entry) => entry.kind === "project")).toBe(true);
  });

  it("does not dismiss when only non-mandatory cash fails", () => {
    const session = newGameSession();
    const league = session.league;
    const board = {
      ...startBoardSeason(defaultBoardState(), NORDSTERN_ID, 1, league, session),
      objectives: [
        {
          id: "league_place",
          kind: "league_place_max" as const,
          target: SURVIVAL_TARGET_PLACE,
          mandatory: true,
          label: "Klassenerhalt",
          icon: "survival",
        },
        {
          id: "club_cash",
          kind: "min_cash" as const,
          target: 50_000_000,
          mandatory: false,
          label: "Cash",
          icon: "cash",
        },
      ],
    };
    const finances = defaultClubFinances();
    const result = evaluateSeasonObjectives(board, league, finances, 1, {
      players: session.players,
      clubId: session.clubId,
      stadium: session.stadium,
      youthCamps: session.youthCamps,
      weeklyWageBill: 50_000,
    });
    expect(result.evaluation.dismissed).toBe(false);
    expect(result.evaluation.failedIds).toContain("club_cash");
  });

  it("dismisses only when a mandatory objective fails", () => {
    const session = newGameSession();
    const board = startBoardSeason(defaultBoardState(), NORDSTERN_ID, 1, session.league, session);
    const league = session.league;
    const finances = { ...defaultClubFinances(), cash: 1 };
    const result = evaluateSeasonObjectives(board, league, finances, 1, {
      players: session.players,
      clubId: session.clubId,
      stadium: session.stadium,
      youthCamps: session.youthCamps,
      weeklyWageBill: 50_000,
    });
    const mandatory = board.objectives.filter((entry) => entry.mandatory);
    const mandatoryFailed = mandatory.some((objective) => {
      const progress = objectiveProgress(objective, league, finances, {
        players: session.players,
        clubId: session.clubId,
        stadium: session.stadium,
        youthCamps: session.youthCamps,
        weeklyWageBill: 50_000,
      });
      return !progress.met;
    });
    expect(result.evaluation.dismissed).toBe(mandatoryFailed);
  });

  it("tracks league place progress", () => {
    const session = newGameSession();
    const board = startBoardSeason(defaultBoardState(), NORDSTERN_ID, 1, session.league, session);
    const placeObjective = board.objectives.find((entry) => entry.id === "league_place")!;
    const progress = objectiveProgress(placeObjective, session.league, defaultClubFinances());
    expect(progress.current).toBeGreaterThan(0);
  });
});
