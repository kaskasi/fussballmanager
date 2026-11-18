import { describe, expect, it } from "vitest";
import { defaultEmployerClubId } from "../board/job-offers.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { buildSummerChecklist, showSummerChecklist } from "./summer-checklist.ts";
import { careerStartWeek, leagueFirstWeek, leagueLastWeek, seasonEndWeek } from "./season-schedule.ts";

describe("summer checklist", () => {
  it("shows after the league schedule or when the season is complete", () => {
    const league = defaultLeagueState();
    expect(showSummerChecklist(leagueLastWeek(), league)).toBe(false);
    expect(showSummerChecklist(seasonEndWeek(), league)).toBe(true);
    expect(showSummerChecklist(20, { ...league, season_complete: true })).toBe(true);
  });

  it("runs through the summer break and pre-season of later seasons (PRD 35)", () => {
    const league = defaultLeagueState();
    expect(showSummerChecklist(1, league, 2)).toBe(true);
    expect(showSummerChecklist(leagueFirstWeek() - 1, league, 2)).toBe(true);
    expect(showSummerChecklist(leagueFirstWeek(), league, 2)).toBe(false);
    expect(showSummerChecklist(careerStartWeek(), league, 1)).toBe(false);
  });

  it("tracks board review after season-end evaluation", () => {
    const board = {
      employer_club_id: defaultEmployerClubId(),
      objectives: [],
      pressure: 0,
      job_status: "employed" as const,
      promotions_this_season: 0,
      last_evaluation: {
        season: 1,
        metIds: [],
        failedIds: [],
        bonusPaid: 0,
        dismissed: false,
        summary: "OK",
      },
    };
    const items = buildSummerChecklist({
      week: 1,
      season: 2,
      league: defaultLeagueState(),
      board,
      trainingPlan: [],
    });
    expect(items.find((item) => item.id === "board_review")?.done).toBe(true);
  });
});
