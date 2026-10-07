import { describe, expect, it } from "vitest";
import { calendarWeek } from "./game-calendar.ts";
import { civilDateFromSession, sessionMonthIndex } from "./session-civil-date.ts";

describe("session civil date", () => {
  it("maps season week and weekday to a stable civil day", () => {
    const wed = civilDateFromSession(1, 3, 3);
    expect(wed.monthIndex).toBeGreaterThanOrEqual(0);
    expect(wed.day).toBeGreaterThanOrEqual(1);
    const same = civilDateFromSession(1, 3, 3);
    expect(same).toEqual(wed);
    const thu = civilDateFromSession(1, 3, 4);
    expect(thu.day).toBe(wed.day + 1);
  });

  it("opens September for Spieltag 2 (KW 36), not August KW heuristic", () => {
    expect(calendarWeek(2)).toBe(36);
    expect(sessionMonthIndex(1, 2, 3)).toBe(8);
    const civil = civilDateFromSession(1, 2, 3);
    expect(civil.monthIndex).toBe(8);
  });

  it("places Rückrunde in the calendar year after the season label", () => {
    const autumn = civilDateFromSession(2, 6, 1);
    const spring = civilDateFromSession(2, 24, 1);
    expect(autumn.year).toBe(2027);
    expect(spring.year).toBe(2028);
    const autumnTime = new Date(autumn.year, autumn.monthIndex, autumn.day).getTime();
    const springTime = new Date(spring.year, spring.monthIndex, spring.day).getTime();
    expect(springTime).toBeGreaterThan(autumnTime);
  });
});
