import { describe, expect, it } from "vitest";
import { normalizeLeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { PYRAMID, tierOf } from "../sim/league-pyramid.ts";
import { estimateCa } from "../transfers/market-value.ts";
import {
  generateWorld,
  NORTHERN_CLUB_COUNT,
  REAL_CLUB_NAMES,
  WORLD_CLUB_SEED,
  worldCareerClubId,
} from "./world-generator.ts";

describe("national tiers 1–3 (PRD 32 §5)", () => {
  const world = generateWorld(2026, WORLD_CLUB_SEED);

  it("puts 18 clubs in every tier, national clubs after the northern ones", () => {
    for (const division of PYRAMID) {
      expect(world.league_pools[division.id]).toHaveLength(division.clubCount);
    }
    world.clubs.forEach((club, index) => {
      const national = !PYRAMID.find((division) => division.id === club.division_id)!.careerStart;
      expect(national).toBe(index >= NORTHERN_CLUB_COUNT);
    });
    expect(new Set(world.clubs.map((club) => club.id)).size).toBe(world.clubs.length);
    expect(new Set(world.clubs.map((club) => club.short_name)).size).toBe(world.clubs.length);
  });

  it("orders tiers by strength, with neighbours overlapping at the edges", () => {
    const meanCa = (divisionId: string) => {
      const clubs = new Set(world.league_pools[divisionId as keyof typeof world.league_pools].map(worldCareerClubId));
      const cas = world.players
        .filter((player) => clubs.has(player.club_id ?? ""))
        .map((player) => estimateCa(player.attributes, player.position));
      return cas.reduce((sum, ca) => sum + ca, 0) / cas.length;
    };
    const means = PYRAMID.map((division) => meanCa(division.id));
    means.slice(1).forEach((mean, index) => expect(mean).toBeLessThan(means[index]!));
  });

  it("never copies a listed real club name and gives higher tiers more reputation", () => {
    const national = world.clubs.slice(NORTHERN_CLUB_COUNT);
    for (const club of national) {
      expect(REAL_CLUB_NAMES.has(club.name.replace(/ (04|1909|1919|Süd|West)$/, ""))).toBe(false);
    }
    const reputation = (tier: number) =>
      national.filter((club) => tierOf(club.division_id) === tier).reduce((sum, club) => sum + club.reputation, 0) / 18;
    expect(reputation(1)).toBeGreaterThan(reputation(2));
    expect(reputation(2)).toBeGreaterThan(reputation(3));
  });

  it("fills a missing national tier without resetting stored northern pools", () => {
    const defaults = defaultLeaguePools();
    const swapped = [...defaults["regionalliga-nord"]].reverse();
    const league = normalizeLeagueState({
      ...normalizeLeagueState(null),
      league_pools: { ...defaults, "regionalliga-nord": swapped, nationalliga: [] },
    });
    expect(league.league_pools!["regionalliga-nord"]).toEqual(swapped);
    expect(league.league_pools!.nationalliga).toEqual(defaults.nationalliga);
  });
});
