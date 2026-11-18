import { describe, expect, it } from "vitest";
import { calendarWeek } from "./game-calendar.ts";
import { careerStartWeek, leagueFirstWeek, seasonEndWeek } from "./season-schedule.ts";
import { calendarGridYear, civilDateFromSession, sessionMonthIndex } from "./session-civil-date.ts";

describe("session civil date", () => {
  it("starts new careers on 13 July (Monday KW 29), Spieltag 1 on 10 August (PRD 35)", () => {
    expect(careerStartWeek()).toBe(3);
    expect(calendarWeek(careerStartWeek())).toBe(29);
    expect(civilDateFromSession(1, careerStartWeek(), 1)).toEqual({ year: 2026, monthIndex: 6, day: 13 });
    expect(civilDateFromSession(1, leagueFirstWeek(), 1)).toEqual({ year: 2026, monthIndex: 7, day: 10 });
  });

  it("maps season week and weekday to a stable civil day", () => {
    const wed = civilDateFromSession(1, 10, 3);
    expect(civilDateFromSession(1, 10, 3)).toEqual(wed);
    const thu = civilDateFromSession(1, 10, 4);
    expect(thu.day).toBe(wed.day + 1);
  });

  it("puts matchday 4 (week 10) in September", () => {
    expect(calendarWeek(10)).toBe(36);
    expect(sessionMonthIndex(1, 10, 3)).toBe(8);
  });

  it("places the second half and the season end in the calendar year after the season label", () => {
    const autumn = civilDateFromSession(2, 10, 1);
    const spring = civilDateFromSession(2, 35, 1);
    const end = civilDateFromSession(2, seasonEndWeek(), 7);
    expect(autumn.year).toBe(2027);
    expect(spring.year).toBe(2028);
    expect(end.year).toBe(2028);
    expect(end.monthIndex).toBeGreaterThanOrEqual(5);
  });

  it("shows each month of the season in the year that holds most of its season days", () => {
    expect(calendarGridYear(1, 7)).toBe(2026); // August: autumn
    expect(calendarGridYear(1, 1)).toBe(2027); // February: spring
    expect(calendarGridYear(1, 6)).toBe(2026); // July: season start
    expect(calendarGridYear(1, 5)).toBe(2027); // June: season end
  });
});
