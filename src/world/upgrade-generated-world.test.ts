import { emptyDivisionPools } from "../sim/league-pyramid.ts";
import { describe, expect, it } from "vitest";
import { CLUBS_PER_DIVISION, GENERATED_CLUB_COUNT } from "./world-generator.ts";
import { expandGeneratedWorld, worldNeedsExpansion } from "./upgrade-generated-world.ts";
import { createSave } from "../persistence/savegame-model.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { legacyWorldState } from "./world-generator.ts";
import { SEED_DIVISION, SEED_OBERLIGA } from "@fussballmanager/shared";

describe("upgrade generated world", () => {
  it("detects legacy six-club league pools", () => {
    const save = createSave({
      nowIso: "2026-09-28T12:00:00Z",
      playerClubId: "cl_fc_nordstern",
      managerName: "Jan",
      season: 1,
      week: 12,
      masterSeed: 2026,
      players: [],
    });
    save.state.world = legacyWorldState(2026);
    save.state.league = {
      ...defaultLeagueState(),
      league_pools: {
        ...emptyDivisionPools(),
        "regionalliga-nord": SEED_DIVISION.map((squad) => squad.team.id),
        "oberliga-nord": SEED_OBERLIGA.map((squad) => squad.team.id),
      },
      club_ids: SEED_DIVISION.map((squad) => squad.team.id),
    };

    expect(worldNeedsExpansion(save)).toBe(true);
    const upgraded = expandGeneratedWorld(save);
    expect(upgraded.state.world?.clubs).toHaveLength(GENERATED_CLUB_COUNT);
    expect(upgraded.state.league?.league_pools?.["regionalliga-nord"]).toHaveLength(
      CLUBS_PER_DIVISION,
    );
    expect(upgraded.state.league?.league_pools?.["oberliga-nord"]).toHaveLength(
      CLUBS_PER_DIVISION,
    );
    expect(upgraded.state.league?.club_ids).toHaveLength(CLUBS_PER_DIVISION);
    expect(upgraded.state.pipeline?.rival_players?.length).toBeGreaterThan(0);
    expect(worldNeedsExpansion(upgraded)).toBe(false);
  });
});
