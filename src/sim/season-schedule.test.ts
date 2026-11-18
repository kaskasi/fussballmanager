import { describe, expect, it } from "vitest";
import {
  careerWeekOrdinal,
  LEAGUE_MATCHDAYS,
  matchdayClock,
  seasonRateScale,
  seasonWeekFromOrdinal,
  weekForMatchday,
  seasonSchedule,
  type SeasonSlotKind,
} from "./season-schedule.ts";

function kinds(season: number, template: "legacy" | "standard"): SeasonSlotKind[] {
  return seasonSchedule(season, template).slots.map((slot) => slot.kind);
}

function count(list: readonly SeasonSlotKind[], kind: SeasonSlotKind): number {
  return list.filter((entry) => entry === kind).length;
}

describe("season schedule — legacy template (layout before PRD 35)", () => {
  it("season 1 runs weeks −1..34 with week = matchday", () => {
    const schedule = seasonSchedule(1, "legacy");
    expect(schedule.firstWeek).toBe(-1);
    expect(schedule.slots.map((slot) => slot.week)).toEqual(
      Array.from({ length: 36 }, (_, index) => index - 1),
    );
    for (const slot of schedule.slots) {
      if (slot.week >= 1) expect(slot.matchday).toBe(slot.week);
      else expect(slot.kind).toBe("preseason");
    }
    expect(schedule.seasonEndWeek).toBe(34);
    expect(seasonRateScale("legacy")).toBe(1);
  });

  it("later seasons start on matchday 1", () => {
    const schedule = seasonSchedule(2, "legacy");
    expect(schedule.firstWeek).toBe(1);
    expect(schedule.slots).toHaveLength(34);
    expect(schedule.slots[0]).toMatchObject({ week: 1, isoWeek: 35, kind: "league", matchday: 1 });
  });
});

describe("season schedule — standard 52-week template (PRD 35 §2)", () => {
  it("has 34 league, 9 cup, 4 pre-season, 2 winter, 2 summer and 1 season-end week", () => {
    const list = kinds(2, "standard");
    expect(list).toHaveLength(52);
    expect(count(list, "league")).toBe(LEAGUE_MATCHDAYS);
    expect(count(list, "cup")).toBe(9);
    expect(count(list, "preseason")).toBe(4);
    expect(count(list, "winter_break")).toBe(2);
    expect(count(list, "summer_break")).toBe(2);
    expect(count(list, "season_end")).toBe(1);
    expect(list.at(-1)).toBe("season_end");
  });

  it("maps season week 1 to ISO 27 and the winter break to ISO 52 and 1", () => {
    const slots = seasonSchedule(2, "standard").slots;
    expect(slots[0]!.isoWeek).toBe(27);
    const winter = slots.filter((slot) => slot.kind === "winter_break").map((slot) => slot.isoWeek);
    expect(winter).toEqual([52, 1]);
    expect(slots.find((slot) => slot.matchday === 1)).toMatchObject({ week: 7, isoWeek: 33 });
    expect(slots.find((slot) => slot.matchday === 17)!.week).toBeLessThan(26);
    expect(slots.find((slot) => slot.matchday === 18)!.week).toBe(28);
    expect(slots.at(-1)).toMatchObject({ week: 52, isoWeek: 26 });
  });

  it("numbers matchdays 1–34 and cup rounds 1–9 in order", () => {
    const slots = seasonSchedule(2, "standard").slots;
    expect(slots.flatMap((slot) => (slot.matchday ? [slot.matchday] : []))).toEqual(
      Array.from({ length: 34 }, (_, index) => index + 1),
    );
    expect(slots.flatMap((slot) => (slot.cupRound ? [slot.cupRound] : []))).toEqual(
      Array.from({ length: 9 }, (_, index) => index + 1),
    );
  });

  it("starts a new career in the first pre-season week", () => {
    const first = seasonSchedule(1, "standard");
    expect(first.firstWeek).toBe(3);
    expect(first.slots[0]!.kind).toBe("preseason");
    expect(count(kinds(1, "standard"), "preseason")).toBe(4);
  });

  it("gives three seasons in a row a pre-season, a winter break and a season end", () => {
    for (const season of [1, 2, 3]) {
      const list = kinds(season, "standard");
      expect(list).toContain("preseason");
      expect(list).toContain("winter_break");
      expect(list.at(-1)).toBe("season_end");
    }
  });

  it("scales per-week rates by 34/52", () => {
    expect(seasonRateScale("standard")).toBeCloseTo(34 / 52, 10);
  });
});

describe("season schedule — active template helpers", () => {
  it("reads the matchday clock: matchdays reached, ≤ 0 before matchday 1", () => {
    expect(matchdayClock(weekForMatchday(1))).toBe(1);
    expect(matchdayClock(weekForMatchday(1) - 1)).toBe(0);
    expect(matchdayClock(weekForMatchday(5) + 1)).toBe(5); // free week after matchday 5
    expect(matchdayClock(52)).toBe(34);
  });

  it("counts career weeks monotonically and back", () => {
    expect(careerWeekOrdinal(2, 1)).toBe(careerWeekOrdinal(1, 52) + 1);
    for (const [season, week] of [[1, 3], [2, 1], [3, 52]] as const) {
      expect(seasonWeekFromOrdinal(careerWeekOrdinal(season, week))).toEqual({ season, week });
    }
  });
});
