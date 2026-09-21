import { SEED_DIVISION } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { playMatchday } from "./matchday.ts";

describe("playMatchday", () => {
  it("simulates three fixtures and fills a six-club table", () => {
    const played = playMatchday({
      squads: SEED_DIVISION,
      matchday: 1,
      baseSeed: 2026,
    });
    expect(played.fixtures).toHaveLength(3);
    expect(played.table).toHaveLength(6);
    expect(played.table.every((row) => row.played === 1)).toBe(true);
    const points = played.table.reduce((sum, row) => sum + row.points, 0);
    expect(points).toBeGreaterThanOrEqual(6);
    expect(points).toBeLessThanOrEqual(9);
    for (const fixture of played.fixtures) {
      expect(fixture.eventCount).toBeGreaterThan(100);
      expect(fixture.homeGoals + fixture.awayGoals).toBeGreaterThanOrEqual(0);
    }
  });
});
