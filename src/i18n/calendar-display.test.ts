import { describe, expect, it } from "vitest";
import { teamworkHint } from "../narrative/captain.ts";
import {
  calendarPhaseDisplay,
  formatCalendarWeekDisplay,
  transferWindowDisplay,
  weekdayShortDisplay,
} from "./calendar-display.ts";
import { setLocale } from "./index.ts";

describe("calendar-display", () => {
  it("localizes week and weekdays in English", () => {
    setLocale("en");
    expect(formatCalendarWeekDisplay(1)).toBe("Week 35");
    expect(weekdayShortDisplay(1)).toBe("Mon");
    expect(transferWindowDisplay(1)).toBe("Summer window");
    expect(calendarPhaseDisplay(1)).toBe("League · matchday 1");
  });

  it("localizes captain teamwork hints", () => {
    setLocale("en");
    expect(teamworkHint(80)).toContain("teamwork");
    setLocale("de");
    expect(teamworkHint(80)).toMatch(/Teamwork/);
  });
});
