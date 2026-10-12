import { describe, expect, it } from "vitest";
import { hubTimetableColumnsForDisplay, type HubTimetableDayColumn } from "./hub-training-timetable.ts";

function col(offset: -1 | 0 | 1): HubTimetableDayColumn {
  return {
    offset,
    weekday: offset + 2,
    weekdayLabel: "Mo",
    dayIndex: 0,
    isMatchPreview: false,
    opponentShortName: null,
    opponentClubId: null,
    slotIndices: [0, 1, 2],
  };
}

describe("hubTimetableColumnsForDisplay", () => {
  const three = [col(-1), col(0), col(1)] as const;

  it("keeps three-day strip on desktop", () => {
    expect(hubTimetableColumnsForDisplay(three, false)).toHaveLength(3);
  });

  it("shows only today column on mobile", () => {
    const out = hubTimetableColumnsForDisplay(three, true);
    expect(out).toHaveLength(1);
    expect(out[0]?.offset).toBe(0);
  });
});
