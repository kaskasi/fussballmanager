import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { boardTargetFromPlayer } from "./scout-board.ts";
import {
  buildScoutRegionMapModel,
  SCOUT_MAP_ZONES,
  toneFromZoneStats,
} from "./scout-region-map.ts";

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

describe("toneFromZoneStats", () => {
  it("returns empty without players", () => {
    expect(toneFromZoneStats({ playerCount: 0, avgUncertainty: null, known: 0, unknown: 0 })).toBe(
      "empty",
    );
  });
});
