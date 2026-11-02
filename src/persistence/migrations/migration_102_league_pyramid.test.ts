import { describe, expect, it } from "vitest";
import { newGameSession, saveFromSession } from "../game-session.ts";
import { PYRAMID } from "../../sim/league-pyramid.ts";
import { GENERATED_CLUB_COUNT, NORTHERN_CLUB_COUNT, worldCareerClubId } from "../../world/world-generator.ts";
import { migration102LeaguePyramid } from "./migration_102_league_pyramid.ts";

const national = PYRAMID.filter((division) => !division.careerStart).map((division) => division.id);

/** A save as written before PRD 32 slice 2: northern clubs, pools and rosters only. */
function northernOnlySave(season: number) {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 4711 });
  const save = structuredClone(saveFromSession(session, undefined, new Date(0)));
  const nationalClubIds = new Set(
    save.state.world!.clubs.slice(NORTHERN_CLUB_COUNT).map((club) => worldCareerClubId(club.id)),
  );
  save.state.world!.clubs = save.state.world!.clubs.slice(0, NORTHERN_CLUB_COUNT);
  for (const id of national) delete (save.state.league!.league_pools as Record<string, unknown>)[id];
  save.state.pipeline!.rival_players = save.state.pipeline!.rival_players!.filter(
    (player) => !nationalClubIds.has(player.club_id ?? ""),
  );
  save.state.season = season;
  return { save, fresh: saveFromSession(session, undefined, new Date(0)) };
}

describe("migration 102 — league pyramid (PRD 32 slice 2)", () => {
  it("adds tiers 1–3 from the save's own seeds", () => {
    const { save, fresh } = northernOnlySave(1);
    const migrated = migration102LeaguePyramid.apply(save);
    expect(migrated.state.world!.clubs).toHaveLength(GENERATED_CLUB_COUNT);
    expect(migrated.state.world!.clubs).toEqual(fresh.state.world!.clubs);
    for (const id of national) {
      expect(migrated.state.league!.league_pools![id]).toEqual(fresh.state.league!.league_pools![id]);
    }
    expect(migrated.state.pipeline!.rival_players!.length).toBe(fresh.state.pipeline!.rival_players!.length);
    expect(migrated.manifest.save_version).toBe(102);
  });

  it("keeps ids unique and moves the new players to the save's season", () => {
    const { save } = northernOnlySave(6);
    const taken = save.state.pipeline!.rival_players![0]!.id;
    const northernCount = save.state.pipeline!.rival_players!.length;
    const migrated = migration102LeaguePyramid.apply(save);
    const rivals = migrated.state.pipeline!.rival_players!;
    const ids = [...migrated.players, ...rivals].map((player) => player.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(taken);
    const added = rivals.slice(northernCount);
    expect(added.length).toBe(54 * 22);
    expect(added.every((player) => (player.contract?.until_season ?? 99) >= 6)).toBe(true);
  });

  it("leaves a save that already has the pyramid alone", () => {
    const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 4711 });
    const save = structuredClone(saveFromSession(session, undefined, new Date(0)));
    const before = save.state.pipeline!.rival_players!.length;
    const migrated = migration102LeaguePyramid.apply(save);
    expect(migrated.state.world!.clubs).toHaveLength(GENERATED_CLUB_COUNT);
    expect(migrated.state.pipeline!.rival_players!.length).toBe(before);
  });
});
