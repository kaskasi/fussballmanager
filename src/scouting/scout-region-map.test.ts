import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { boardTargetFromPlayer } from "./scout-board.ts";
import {
  buildScoutDiscoveryMapModel,
  buildScoutRegionMapModel,
  SCOUT_MAP_ZONES,
  toneFromZoneStats,
} from "./scout-region-map.ts";
import { emptyDiscovery } from "./scout-discovery.ts";
import type { WorldClub } from "../world/world-generator.ts";
import type { Player } from "../types/player.ts";

describe("buildScoutRegionMapModel", () => {
  it("returns four zones matching SCOUT_MAP_ZONES", () => {
    const model = buildScoutRegionMapModel([]);
    expect(model.zones).toHaveLength(4);
    expect(model.zones.map((z) => z.id)).toEqual(SCOUT_MAP_ZONES.map((z) => z.id));
  });

  it("buckets players by world birth region", () => {
    const foerde = clonePlayer();
    foerde.birth.region = "Fördeküste";
    const hanse = clonePlayer();
    hanse.id = "pl_hanse";
    hanse.birth.region = "Hansebogen";
    const targets = [
      boardTargetFromPlayer(foerde, { uncertaintyRange: 15, sampleSize: 2, estimatedAbilityMean: 70 }),
      boardTargetFromPlayer(hanse, { uncertaintyRange: 45, sampleSize: 0, estimatedAbilityMean: 65 }),
    ];
    const model = buildScoutRegionMapModel(targets);
    const foerdeZone = model.zones.find((z) => z.id === "foerde");
    const hanseZone = model.zones.find((z) => z.id === "hanse");
    expect(foerdeZone?.playerCount).toBe(1);
    expect(foerdeZone?.tone).toBe("strong");
    expect(hanseZone?.playerCount).toBe(1);
    expect(hanseZone?.tone).toBe("weak");
  });

  it("marks unmapped regions as empty on all zones", () => {
    const orphan = clonePlayer();
    orphan.birth.region = "Unknown Land";
    const model = buildScoutRegionMapModel([
      boardTargetFromPlayer(orphan, { uncertaintyRange: 10, sampleSize: 1, estimatedAbilityMean: 60 }),
    ]);
    expect(model.zones.every((z) => z.playerCount === 0)).toBe(true);
  });
});

describe("buildScoutDiscoveryMapModel", () => {
  it("counts pool expected only for directory-visible clubs", () => {
    const clubs: WorldClub[] = [
      {
        id: "div",
        name: "Div FC",
        short_name: "DFC",
        place: "Kiel",
        region: "Fördeküste",
        division_id: "regionalliga-nord",
        identity: "community",
        reputation: 50,
        rivalry_ids: [],
        kit: { primary: "#336699", secondary: "#224466" },
      },
      {
        id: "foreign",
        name: "Foreign FC",
        short_name: "FFC",
        place: "Flensburg",
        region: "Fördeküste",
        division_id: "oberliga-nord",
        identity: "community",
        reputation: 40,
        rivalry_ids: [],
        kit: { primary: "#993366", secondary: "#662244" },
      },
    ];
    const rivals = [
      { id: "p1", club_id: "cl_div", squad_status: "pro" },
      { id: "p2", club_id: "cl_div", squad_status: "pro" },
    ] as unknown as readonly Player[];

    const discovery = emptyDiscovery();
    const model = buildScoutDiscoveryMapModel({
      clubs,
      targets: [],
      rivalPlayers: rivals,
      discovery,
      playerDivisionId: "regionalliga-nord",
    });
    const foerde = model.zones.find((zone) => zone.id === "foerde");
    expect(foerde?.poolExpected).toBe(2);
    expect(foerde?.regionTier).toBe(0);
    expect(foerde?.cardMode).toBe("locked");
    expect(foerde?.mapUnlocked).toBe(false);
    expect(foerde?.clubs.filter((club) => club.directoryVisible)).toHaveLength(1);
  });

  it("home zone is unlocked with flavor card mode when player club is in zone", () => {
    const playerClub: WorldClub = {
      id: "nord",
      name: "Nordstern",
      short_name: "NS",
      place: "Kiel",
      region: "Fördeküste",
      division_id: "regionalliga-nord",
      identity: "community",
      reputation: 55,
      rivalry_ids: [],
      kit: { primary: "#2e9e46", secondary: "#1e7a38" },
    };
    const discovery = emptyDiscovery();
    const model = buildScoutDiscoveryMapModel({
      clubs: [playerClub],
      targets: [],
      rivalPlayers: [],
      discovery,
      playerDivisionId: "regionalliga-nord",
      playerClub,
    });
    const foerde = model.zones.find((zone) => zone.id === "foerde");
    expect(foerde?.mapUnlocked).toBe(true);
    expect(foerde?.cardMode).toBe("unlocked");
    const hanse = model.zones.find((zone) => zone.id === "hanse");
    expect(hanse?.mapUnlocked).toBe(false);
    expect(hanse?.cardMode).toBe("locked");
  });
});

describe("toneFromZoneStats", () => {
  it("returns empty without players", () => {
    expect(toneFromZoneStats({ playerCount: 0, avgUncertainty: null, known: 0, unknown: 0 })).toBe(
      "empty",
    );
  });
});
