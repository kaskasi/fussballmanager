import { describe, expect, it } from "vitest";
import { estimateCa } from "../transfers/market-value.ts";
import { validatePlayer } from "../types/validation.ts";
import {
  CLUBS_PER_DIVISION,
  GENERATED_CLUB_COUNT,
  GENERATED_PLAYER_COUNT,
  NORDSTERN_CLUB_ID,
  PLAYERS_PER_CLUB,
  deriveWorldSeed,
  generateClubRoster,
  generateWorld,
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
    expect(world.clubs.filter((club) => club.id === NORDSTERN_CLUB_ID)).toHaveLength(1);

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
      const roster = world.players.filter((player) => player.club_id === club.id);
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
      for (const player of roster) {
        expect(validatePlayer(player), player.id).toEqual({ valid: true, errors: [] });
        expect(player.club_id).toBe(club.id);
        expect(player.contract).not.toBeNull();
        expect("potential" in player).toBe(false);
      }
    }
  });

  it("keeps entity streams independent and roster generation addressable", () => {
    const world = generateWorld(8080);
    const club = world.clubs[7]!;
    const directRoster = generateClubRoster(8080, club, 7);
    const worldRoster = world.players.filter((player) => player.club_id === club.id);

    expect(directRoster).toEqual(worldRoster);
    expect(deriveWorldSeed(8080, "player", 7)).not.toBe(
      deriveWorldSeed(8080, "contract", 7),
    );
  });

  it("places Nordstern in the playable underdog corridor", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const world = generateWorld(seed);
      const upperClubs = world.clubs.filter(
        (club) => club.division_id === "regionalliga-nord",
      );
      const strengths = upperClubs
        .map((club) => ({
          id: club.id,
          ca: average(
            world.players
              .filter((player) => player.club_id === club.id)
              .map((player) => estimateCa(player.attributes, player.position)),
          ),
        }))
        .sort((left, right) => left.ca - right.ca);
      const nordstern = strengths.find((entry) => entry.id === NORDSTERN_CLUB_ID)!;
      const median = strengths[Math.floor(strengths.length / 2)]!;
      const secondWeakest = strengths[1]!;

      expect(median.ca - nordstern.ca).toBeGreaterThanOrEqual(8);
      expect(median.ca - nordstern.ca).toBeLessThanOrEqual(15);
      expect(secondWeakest.ca - nordstern.ca).toBeLessThanOrEqual(5);
    }
  });
});

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
