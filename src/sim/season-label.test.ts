import { describe, expect, it } from "vitest";
import { formatSeasonLabel, seasonCalendarYear } from "./season-label.ts";

describe("season calendar year", () => {
  it("maps season 1 to 2026 and adds completed seasons", () => {
    expect(seasonCalendarYear(1)).toBe(2026);
    expect(seasonCalendarYear(2)).toBe(2027);
    expect(seasonCalendarYear(4)).toBe(2029);
    expect(formatSeasonLabel(1)).toBe("Saison 2026");
  });
});
