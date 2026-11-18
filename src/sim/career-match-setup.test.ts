import { describe, expect, it } from "vitest";
import { NORDSTERN_ID } from "@fussballmanager/shared";
import { newGameSession } from "../persistence/game-session.ts";
import { careerMatchSeed, prepareCareerMatch } from "./career-match-setup.ts";
import { isLeagueWeek } from "./season-schedule.ts";
import { weekForMatchday as md } from "./season-schedule.ts";

describe("career match setup", () => {
  it("prepares a league fixture for the current match week", () => {
    const session = newGameSession();
    session.week = md(1);
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    expect(setup?.calendarWeek).toBe(md(1));
    expect(setup?.matchday).toBe(1);
    expect(setup?.playerClubId).toBe(NORDSTERN_ID);
    expect(isLeagueWeek(setup!.calendarWeek)).toBe(true);
  });

  it("uses the same seed formula as the matchday engine", () => {
    const session = newGameSession();
    session.week = md(1);
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    const seed = careerMatchSeed(
      session.masterSeed,
      session.season,
      setup!.calendarWeek,
      setup!.matchday,
      setup!.fixture,
      session.league.club_ids,
    );
    expect(seed).toBe(setup!.seed);
  });

  it("skips non-league weeks", () => {
    const session = newGameSession();
    session.week = 1; // summer break (PRD 35)
    expect(prepareCareerMatch(session)).toBeNull();
  });
});
