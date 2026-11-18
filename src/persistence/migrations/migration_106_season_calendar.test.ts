import { describe, expect, it } from "vitest";
import { newGameSession, saveFromSession } from "../game-session.ts";
import { calendarDayIndex } from "../../sim/calendar-days.ts";
import { weekForMatchday } from "../../sim/season-schedule.ts";
import {
  migrateLegacyCareerDay,
  migrateLegacyCareerWeekIndex,
  migrateLegacyDayIndex,
  migrateLegacyWeek,
  migration106SeasonCalendar,
} from "./migration_106_season_calendar.ts";

describe("migration 106 — season calendar (PRD 35 §5)", () => {
  it("moves a legacy week to the week with the same matchday", () => {
    expect(migrateLegacyWeek(1)).toBe(weekForMatchday(1));
    expect(migrateLegacyWeek(20)).toBe(weekForMatchday(20));
    expect(migrateLegacyWeek(34)).toBe(weekForMatchday(34));
    expect(migrateLegacyWeek(0)).toBe(weekForMatchday(1) - 1);
    expect(migrateLegacyWeek(-1)).toBe(weekForMatchday(1) - 2);
  });

  it("re-encodes day indices with 52-week seasons", () => {
    // Legacy: season 2, week (= matchday) 10, Wednesday.
    const legacy = 1 * 34 * 7 + 9 * 7 + 2;
    expect(migrateLegacyDayIndex(legacy)).toBe(calendarDayIndex(2, weekForMatchday(10), 3));
  });

  it("re-encodes career-week indices and career days", () => {
    expect(migrateLegacyCareerWeekIndex(52 + 5)).toBe(52 + weekForMatchday(5));
    expect(migrateLegacyCareerWeekIndex(-1)).toBe(weekForMatchday(1) - 2);
    expect(migrateLegacyCareerDay((52 + 5) * 7 + 3)).toBe((52 + weekForMatchday(5)) * 7 + 3);
  });

  it("migrates the session week, player day stamps and story weeks", () => {
    const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 7 });
    const save = structuredClone(saveFromSession(session, undefined, new Date(0)));
    save.state.week = 12;
    save.manifest.current_week = { season: save.state.season, week: 12 };
    const first = save.players[0] as { contract_talks_locked_until_day?: number };
    first.contract_talks_locked_until_day = 1 * 34 * 7 + 3;
    const migrated = migration106SeasonCalendar.apply(save);
    expect(migrated.state.week).toBe(weekForMatchday(12));
    expect(migrated.manifest.current_week.week).toBe(weekForMatchday(12));
    const migratedFirst = migrated.players[0] as { contract_talks_locked_until_day?: number };
    expect(migratedFirst.contract_talks_locked_until_day).toBe(calendarDayIndex(2, weekForMatchday(1), 4));
    expect(migrated.manifest.save_version).toBe(106);
  });
});
