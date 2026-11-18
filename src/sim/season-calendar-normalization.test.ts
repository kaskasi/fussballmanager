/**
 * PRD 35 §4 / PRD 30 phase 4 rule: one simulated year of growth and of weekly
 * finances under the 52-week template stays within ±5 % of the legacy 34-week year.
 *
 * Legacy year: 34 league weeks, rate scale 1. New year: every slot of the standard
 * template with its own scales. Minutes follow the pipeline rule: league weeks use
 * the player's role; every other week keeps the last league week's minutes
 * (`weekly_minutes` also survives the season-end reset).
 */
import { describe, expect, it } from "vitest";
import type { Attributes } from "../types/player.ts";
import { calculateWeeklyGrowth } from "../development/growth-engine.ts";
import { buildWeeklyFinanceLines, type WeeklyFinanceContext } from "../economy/club-finances.ts";
import { defaultClubStadium } from "../stadium/club-stadium.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  offMatchWeekScale,
  seasonRateScale,
  seasonSchedule,
  type SeasonSlot,
} from "./season-schedule.ts";

const TOLERANCE = 0.05;

interface Profile {
  age: number;
  minutes: number;
}

const AGES = [17, 19, 21, 23, 25, 27, 29, 31, 33];
const ROLES = [90, 68, 22, 0];
const ATTRIBUTES: (keyof Attributes)[] = ["passing", "pace", "stamina", "positioning", "technique"];

function profiles(): Profile[] {
  return AGES.flatMap((age) => ROLES.map((minutes) => ({ age, minutes })));
}

function standardSlots(): readonly SeasonSlot[] {
  return seasonSchedule(2, "standard").slots;
}

/** Net attribute change of one player over a season of `weeks`. */
function yearGrowth(
  profile: Profile,
  attribute: keyof Attributes,
  weeks: readonly { minutes: number }[],
  rateScale: number,
): number {
  let value = 110;
  for (const week of weeks) {
    value += calculateWeeklyGrowth({
      age: profile.age,
      maturityOffset: 0,
      attribute,
      value,
      anlage: 1.1,
      drive: 1.1,
      minutes: week.minutes,
      injured: false,
      focusSlots: 1,
      noise: 1,
      rateScale,
    });
  }
  return value - 110;
}

function legacyWeeks(profile: Profile): { minutes: number }[] {
  return Array.from({ length: 34 }, () => ({ minutes: profile.minutes }));
}

function standardWeeks(profile: Profile): { minutes: number }[] {
  // League weeks: the role's minutes. Other weeks: the carried last league week, i.e. the same.
  return standardSlots().map(() => ({ minutes: profile.minutes }));
}

function ratio(after: number, before: number): number {
  return after / before;
}

describe("season calendar normalization (PRD 35 §4)", () => {
  it("keeps one year of development gain within ±5 % for young players", () => {
    let before = 0;
    let after = 0;
    for (const profile of profiles().filter((entry) => entry.age <= 23)) {
      for (const attribute of ATTRIBUTES) {
        before += yearGrowth(profile, attribute, legacyWeeks(profile), 1);
        after += yearGrowth(profile, attribute, standardWeeks(profile), seasonRateScale("standard"));
      }
    }
    expect(before).toBeGreaterThan(0);
    expect(Math.abs(ratio(after, before) - 1)).toBeLessThanOrEqual(TOLERANCE);
  });

  it("keeps one year of development within ±5 % for every minutes role", () => {
    for (const minutes of ROLES) {
      let before = 0;
      let after = 0;
      for (const profile of profiles().filter((entry) => entry.minutes === minutes && entry.age <= 25)) {
        for (const attribute of ATTRIBUTES) {
          before += yearGrowth(profile, attribute, legacyWeeks(profile), 1);
          after += yearGrowth(profile, attribute, standardWeeks(profile), seasonRateScale("standard"));
        }
      }
      expect(Math.abs(ratio(after, before) - 1), `minutes ${minutes}`).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it("keeps one year of late-career decline within ±5 %", () => {
    let before = 0;
    let after = 0;
    for (const profile of profiles().filter((entry) => entry.age >= 31 && entry.minutes === 0)) {
      for (const attribute of ["pace", "stamina"] as const) {
        before += yearGrowth(profile, attribute, legacyWeeks(profile), 1);
        after += yearGrowth(profile, attribute, standardWeeks(profile), seasonRateScale("standard"));
      }
    }
    expect(before).toBeLessThan(0);
    expect(Math.abs(ratio(after, before) - 1)).toBeLessThanOrEqual(TOLERANCE);
  });

  it("keeps one year of recurring finances within ±5 % per line and in total", () => {
    const players = [70, 71, 72].map((index) => {
      const player = clonePlayer();
      player.id = `pl_norm_${index}`;
      player.club_id = "cl_norm";
      player.contract = { ...player.contract!, wage_weekly: 4_000 + index * 10 };
      return player;
    });
    const stadium = defaultClubStadium();
    const context = (week: number, home: boolean): WeeklyFinanceContext => ({
      players,
      clubId: "cl_norm",
      divisionId: "regionalliga-nord",
      isHomeMatchWeek: home,
      season: 2,
      week,
      stadium,
    });
    const sumByKind = (lines: readonly { kind: string; amount: number }[], into: Map<string, number>) => {
      for (const line of lines) into.set(line.kind, (into.get(line.kind) ?? 0) + line.amount);
    };

    const before = new Map<string, number>();
    for (let matchday = 1; matchday <= 34; matchday += 1) {
      sumByKind(buildWeeklyFinanceLines(context(matchday, matchday % 2 === 1), { perWeek: 1, offMatch: 1 }), before);
    }
    const after = new Map<string, number>();
    for (const slot of standardSlots()) {
      const home = slot.kind === "league" && (slot.matchday ?? 0) % 2 === 1;
      sumByKind(
        buildWeeklyFinanceLines(context(slot.week, home), {
          perWeek: seasonRateScale("standard"),
          offMatch: offMatchWeekScale("standard"),
        }),
        after,
      );
    }

    let totalBefore = 0;
    let totalAfter = 0;
    for (const [kind, amount] of before) {
      totalBefore += amount;
      totalAfter += after.get(kind) ?? 0;
      if (Math.abs(amount) > 0) {
        expect(Math.abs(ratio(after.get(kind) ?? 0, amount) - 1), kind).toBeLessThanOrEqual(TOLERANCE);
      }
    }
    expect(Math.abs(ratio(totalAfter, totalBefore) - 1)).toBeLessThanOrEqual(TOLERANCE);
  });
});
