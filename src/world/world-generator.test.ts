import { describe, expect, it } from "vitest";
import { asTeamId, matchdayFixtures } from "@fussballmanager/shared";
import { estimateCa } from "../transfers/market-value.ts";
import { validatePlayer } from "../types/validation.ts";
import {
  CLUBS_PER_DIVISION,
  GENERATED_CLUB_COUNT,
  GENERATED_PLAYER_COUNT,
  NORDSTERN_TEAM_ID,
  PLAYERS_PER_CLUB,
  deriveWorldSeed,
  generateClubRoster,
  generateWorld,
  WORLD_CLUB_SEED,
  worldCareerClubId,
} from "./world-generator.ts";

describe("deterministic world generator", () => {
  it("reproduces a complete world from the same seed", () => {
    const first = generateWorld(2026);
    const second = generateWorld(2026);

    expect(first).toEqual(second);
    expect(first.clubs).toHaveLength(GENERATED_CLUB_COUNT);
    expect(first.players).toHaveLength(GENERATED_PLAYER_COUNT);
    expect(first.league_pools["regionalliga-nord"]).toHaveLength(CLUBS_PER_DIVISION);
    expect(first.league_pools["oberliga-nord"]).toHaveLength(CLUBS_PER_DIVISION);
  });

  it("changes identities for a different seed", () => {
    const first = generateWorld(2026);
    const second = generateWorld(90210);
    const secondPlayerIds = new Set(second.players.map((player) => player.id));
    const secondNames = new Set(
      second.players.map((player) => `${player.name.first} ${player.name.last}`),
    );
    const unchangedIds = first.players.filter((player) => secondPlayerIds.has(player.id));
    const unchangedNames = first.players.filter((player) =>
      secondNames.has(`${player.name.first} ${player.name.last}`),
    );

    expect(unchangedIds.length / first.players.length).toBeLessThan(0.1);
    expect(unchangedNames.length / first.players.length).toBeLessThan(0.1);
    expect(first.clubs[1]?.name).not.toBe(second.clubs[1]?.name);
  });

  it("uses unique clubs, player ids, and valid rivalry links", () => {
    const world = generateWorld(77);
    const clubIds = new Set(world.clubs.map((club) => club.id));
    const clubNames = new Set(world.clubs.map((club) => club.name));
    const playerIds = new Set(world.players.map((player) => player.id));

    expect(clubIds.size).toBe(GENERATED_CLUB_COUNT);
    expect(clubNames.size).toBe(GENERATED_CLUB_COUNT);
    expect(playerIds.size).toBe(GENERATED_PLAYER_COUNT);
    expect(world.clubs.filter((club) => club.id === NORDSTERN_TEAM_ID)).toHaveLength(1);

    for (const club of world.clubs) {
      expect(club.rivalry_ids.length).toBeLessThanOrEqual(2);
      expect(club.rivalry_ids).not.toContain(club.id);
      for (const rivalId of club.rivalry_ids) {
        expect(clubIds.has(rivalId)).toBe(true);
        expect(world.clubs.find((candidate) => candidate.id === rivalId)?.division_id)
          .toBe(club.division_id);
      }
    }
  });

  it("creates 22 valid professionals with the required roster shape per club", () => {
    const world = generateWorld(411);
    const expectedPositions = {
      GK: 2,
      CB: 4,
      LB: 2,
      RB: 2,
      DM: 1,
      CM: 3,
      AM: 2,
      LW: 1,
      RW: 1,
      RM: 1,
      CF: 3,
    };

    for (const club of world.clubs) {
      const clubId = worldCareerClubId(club.id);
      const roster = world.players.filter((player) => player.club_id === clubId);
      const positionCounts = Object.fromEntries(
        Object.keys(expectedPositions).map((position) => [
          position,
          roster.filter((player) => player.position === position).length,
        ]),
      );

      expect(roster).toHaveLength(PLAYERS_PER_CLUB);
      expect(positionCounts).toEqual(expectedPositions);
      expect(roster.filter((player) => player.age <= 21).length).toBeGreaterThanOrEqual(2);
      expect(roster.filter((player) => player.age >= 30).length).toBeGreaterThanOrEqual(2);
      expect(roster.some((player) => player.position === "GK")).toBe(true);
      for (const player of roster) {
        expect(validatePlayer(player), player.id).toEqual({ valid: true, errors: [] });
        expect(player.club_id).toBe(clubId);
        expect(player.contract).not.toBeNull();
        expect("potential" in player).toBe(false);
      }
    }
  });

  it("supports a 34-round home-and-away schedule", () => {
    const world = generateWorld(2026);
    const ids = world.league_pools["regionalliga-nord"].map(asTeamId);
    const fixtures = Array.from({ length: 34 }, (_, index) =>
      matchdayFixtures(ids, index + 1),
    ).flat();
    const pairCounts = new Map<string, number>();
    const homeCounts = new Map<string, number>();

    for (const fixture of fixtures) {
      const pair = [fixture.homeTeamId, fixture.awayTeamId].sort().join(":");
      pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      homeCounts.set(fixture.homeTeamId, (homeCounts.get(fixture.homeTeamId) ?? 0) + 1);
    }

    expect(fixtures).toHaveLength(306);
    expect([...pairCounts.values()].every((count) => count === 2)).toBe(true);
    expect(ids.every((id) => homeCounts.get(id) === 17)).toBe(true);
  });

  it("spreads U21 ages across the 22, not only GK/CB", () => {
    const world = generateWorld(411);
    const young = world.players.filter((player) => player.age <= 21);
    const youngOutfield = young.filter(
      (player) => player.position !== "GK" && player.position !== "CB",
    );
    expect(youngOutfield.length).toBeGreaterThan(50);
  });

  it("spreads professional skills by position, not a 69–84 blob", () => {
    const world = generateWorld(2026);
    const nordstern = world.players.filter(
      (player) => player.club_id === worldCareerClubId(NORDSTERN_TEAM_ID),
    );
    const outfield = nordstern.filter((player) => player.position !== "GK");
    const shooting = outfield.map((player) => player.attributes.shooting);
    expect(Math.max(...shooting) - Math.min(...shooting)).toBeGreaterThan(20);
    const cfShoot = average(
      nordstern.filter((player) => player.position === "CF").map((player) => player.attributes.shooting),
    );
    const cbShoot = average(
      nordstern.filter((player) => player.position === "CB").map((player) => player.attributes.shooting),
    );
    expect(cfShoot - cbShoot).toBeGreaterThan(12);
  });

  it("keeps entity streams independent and roster generation addressable", () => {
    const world = generateWorld(8080);
    const club = world.clubs[7]!;
    const directRoster = generateClubRoster(8080, club, 7);
    const worldRoster = world.players.filter(
      (player) => player.club_id === worldCareerClubId(club.id),
    );

    expect(directRoster).toEqual(worldRoster);
    expect(deriveWorldSeed(8080, "player", 7)).not.toBe(
      deriveWorldSeed(8080, "contract", 7),
    );
  });

  it("keeps the club layer fixed while the roster seed changes the players", () => {
    const first = generateWorld(11, WORLD_CLUB_SEED);
    const second = generateWorld(12, WORLD_CLUB_SEED);
    expect(second.clubs).toEqual(first.clubs);
    expect(second.league_pools).toEqual(first.league_pools);
    expect(second.club_seed).toBe(WORLD_CLUB_SEED);
    const firstNames = new Set(first.players.map((p) => `${p.name.first} ${p.name.last}`));
    const shared = second.players.filter((p) => firstNames.has(`${p.name.first} ${p.name.last}`));
    expect(shared.length / second.players.length).toBeLessThan(0.1);
  });

  it.each([
    ["a fully seeded world", (seed: number) => generateWorld(seed)],
    ["the fixed career club layer", (seed: number) => generateWorld(seed, WORLD_CLUB_SEED)],
  ])("places Nordstern in the playable underdog corridor (%s)", (_label, build) => {
    for (let seed = 1; seed <= 100; seed++) {
      const world = build(seed);
      const upperClubs = world.clubs.filter(
        (club) => club.division_id === "regionalliga-nord",
      );
      const strengths = upperClubs
        .map((club) => ({
          id: club.id,
          ca: average(
            world.players
              .filter((player) => player.club_id === worldCareerClubId(club.id))
              .map((player) => estimateCa(player.attributes, player.position)),
          ),
        }))
        .sort((left, right) => left.ca - right.ca);
      const nordstern = strengths.find((entry) => entry.id === NORDSTERN_TEAM_ID)!;
      const median = strengths[Math.floor(strengths.length / 2)]!;
      const secondWeakest = strengths[1]!;

      expect(median.ca - nordstern.ca).toBeGreaterThanOrEqual(6);
      expect(median.ca - nordstern.ca).toBeLessThanOrEqual(17);
      expect(secondWeakest.ca - nordstern.ca).toBeLessThanOrEqual(6.5);
    }
  });
});

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
