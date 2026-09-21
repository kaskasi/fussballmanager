import { describe, expect, it } from "vitest";
import { asTeamId } from "./ids.ts";
import { matchdayFixtures, standings } from "./league.ts";
import { SEED_DIVISION } from "./seed-division.ts";
import { squadIssues } from "./squad.ts";

describe("seed division", () => {
  it("has six valid squads and unique ids", () => {
    expect(SEED_DIVISION).toHaveLength(6);
    const ids = SEED_DIVISION.map((squad) => squad.team.id);
    expect(new Set(ids).size).toBe(6);
    for (const squad of SEED_DIVISION) {
      expect(squadIssues(squad)).toEqual([]);
    }
  });
});

describe("matchday fixtures", () => {
  it("pairs every club once on matchday 1", () => {
    const ids = SEED_DIVISION.map((squad) => squad.team.id);
    const fixtures = matchdayFixtures(ids, 1);
    expect(fixtures).toHaveLength(3);
    const seen = fixtures.flatMap((fixture) => [
      fixture.homeTeamId,
      fixture.awayTeamId,
    ]);
    expect(new Set(seen).size).toBe(6);
    expect(fixtures.every((fixture) => fixture.matchday === 1)).toBe(true);
  });

  it("rotates opponents on matchday 2", () => {
    const ids = SEED_DIVISION.map((squad) => squad.team.id);
    const first = matchdayFixtures(ids, 1);
    const second = matchdayFixtures(ids, 2);
    const firstPairs = new Set(
      first.map((fixture) => [fixture.homeTeamId, fixture.awayTeamId].sort().join(":")),
    );
    for (const fixture of second) {
      expect(
        firstPairs.has([fixture.homeTeamId, fixture.awayTeamId].sort().join(":")),
      ).toBe(false);
    }
  });
});

describe("standings", () => {
  it("awards 3/1/0 and ranks by points then goal difference", () => {
    const a = asTeamId("a");
    const b = asTeamId("b");
    const c = asTeamId("c");
    const d = asTeamId("d");
    const table = standings([a, b, c, d], [
      { homeTeamId: a, awayTeamId: b, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: c, awayTeamId: d, homeGoals: 1, awayGoals: 1 },
    ]);
    expect(table[0]?.teamId).toBe(a);
    expect(table[0]?.points).toBe(3);
    expect(table[0]?.goalDifference).toBe(2);
    expect(table.find((row) => row.teamId === c)?.points).toBe(1);
    expect(table.find((row) => row.teamId === b)?.lost).toBe(1);
    expect(table.every((row) => row.played === 1)).toBe(true);
  });
});
