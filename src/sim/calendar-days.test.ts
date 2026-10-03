import { describe, expect, it } from "vitest";
import { addCalendarDays, calendarDayIndex, daysUntil } from "./calendar-days.ts";

describe("calendar days", () => {
  it("adds 60 days inside a season", () => {
    const next = addCalendarDays({ season: 1, week: 1, weekday: 1 }, 60);
    expect(next.week).toBe(9);
    expect(next.weekday).toBe(5);
    expect(next.season).toBe(1);
  });

  it("wraps into the next season after week 34", () => {
    const next = addCalendarDays({ season: 1, week: 34, weekday: 7 }, 1);
    expect(next).toMatchObject({ season: 2, week: 1, weekday: 1 });
  });

  it("counts remaining days until a lock", () => {
    const now = { season: 1, week: 3, weekday: 1 };
    const until = calendarDayIndex(1, 3, 1) + 45;
    expect(daysUntil(now, until)).toBe(45);
    expect(daysUntil(addCalendarDays(now, 45), until)).toBe(0);
  });
});
