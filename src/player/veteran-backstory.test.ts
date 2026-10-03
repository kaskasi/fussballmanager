import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { generateWorld } from "../world/world-generator.ts";
import {
  applyVeteranBackstory,
  peakCaBaseAdjustment,
  seedFromPlayerId,
} from "./veteran-backstory.ts";
import { listCareerStatSeasons, PRO_DEBUT_AGE } from "./season-stats.ts";
import { seasonCalendarYear } from "../sim/season-label.ts";

describe("veteran backstory", () => {
  it("peaks CA adjustment around 28–31", () => {
    expect(peakCaBaseAdjustment(30)).toBeGreaterThan(peakCaBaseAdjustment(22));
    expect(peakCaBaseAdjustment(30)).toBeGreaterThan(peakCaBaseAdjustment(36));
  });

  it("adds growth archives and stamps for veterans", () => {
    const player = clonePlayer();
    player.age = 30;
    player.squad_status = "pro";
    const next = applyVeteranBackstory(player, seedFromPlayerId(player.id));
    expect(next.history.growth.length).toBe(30 - PRO_DEBUT_AGE);
    expect(seasonCalendarYear(next.history.growth[0]!.season)).toBe(2015);
    expect(next.history.career_stamps?.length).toBeGreaterThan(0);
    const pills = listCareerStatSeasons(next, 1);
    expect(pills.length).toBe(12);
    expect(seasonCalendarYear(pills[0]!)).toBe(2015);
    expect(seasonCalendarYear(pills.at(-1)!)).toBe(2026);
  });

  it("skips youth and players below pro debut age", () => {
    const young = clonePlayer();
    young.age = 18;
    expect(applyVeteranBackstory(young, 1).history.growth).toHaveLength(0);
  });

  it("raises average CA for 30+ in generated world", () => {
    const world = generateWorld(42);
    const veterans = world.players.filter((player) => player.age >= 30);
    const avgCa =
      veterans.reduce((sum, player) => sum + estimateCa(player.attributes, player.position), 0) /
      veterans.length;
    expect(avgCa).toBeGreaterThan(72);
    expect(veterans.some((player) => (player.history.career_stamps?.length ?? 0) > 0)).toBe(true);
  });
});
