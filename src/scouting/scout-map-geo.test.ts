import { describe, expect, it } from "vitest";
import { buildZoneMapNodes, layoutForZone } from "./scout-map-layout.ts";
import { geoToReliefSvg, mapCoordsForPlace } from "./scout-map-geo.ts";
import type { ScoutMapClubPin } from "./scout-region-map.ts";
import { generateWorld } from "../world/world-generator.ts";

describe("scout-map-geo", () => {
  it("projects SH cities into the SH relief clip", () => {
    const layout = layoutForZone("sh");
    expect(layout).toBeDefined();
    for (const city of ["Elmshorn", "Glückstadt", "Kaltenkirchen", "Hasloh"]) {
      const coords = mapCoordsForPlace(city, layout!);
      expect(coords).not.toBeNull();
      const [vbX = 0, vbY = 0, vbW = 100, vbH = 100] = layout!.reliefViewBox
        .split(/\s+/)
        .map(Number);
      expect(coords!.x).toBeGreaterThanOrEqual(vbX - 20);
      expect(coords!.x).toBeLessThanOrEqual(vbX + vbW + 20);
      expect(coords!.y).toBeGreaterThanOrEqual(vbY - 20);
      expect(coords!.y).toBeLessThanOrEqual(vbY + vbH + 20);
    }
  });

  it("places Hanse clubs on the urban 0–100 canvas", () => {
    const layout = layoutForZone("hanse");
    expect(layout?.mapMode).toBe("city");
    const bremen = mapCoordsForPlace("Bremen", layout!);
    const hamburg = mapCoordsForPlace("Hamburg", layout!);
    expect(bremen!.x).toBeGreaterThan(0);
    expect(bremen!.x).toBeLessThan(100);
    expect(hamburg!.x).toBeGreaterThan(bremen!.x);
  });

  it("aligns club pins with GPS when place is set", () => {
    const layout = layoutForZone("sh")!;
    const pin: ScoutMapClubPin = {
      careerClubId: "cl_test_elm",
      name: "FC Elmshorn",
      place: "Elmshorn",
      shortName: "ELM",
      directoryVisible: true,
      discovered: false,
      poolCount: 0,
      poolExpected: 0,
      poolPct: 0,
      scoutProgress: null,
    };
    const [node] = buildZoneMapNodes(layout, [pin]);
    const expected = geoToReliefSvg(53.7535, 9.6534);
    expect(node!.x).toBeCloseTo(expected.x, 0);
    expect(node!.y).toBeCloseTo(expected.y, 0);
  });
});

describe("generateWorld real cities", () => {
  it("assigns named SH cities to Nordküste and Elbmarsch clubs", () => {
    const world = generateWorld(2026);
    const shPlaces = new Set(
      world.clubs
        .filter((club) => club.region === "Nordküste" || club.region === "Elbmarsch")
        .map((club) => club.place),
    );
    expect(shPlaces.has("Elmshorn")).toBe(true);
    expect(shPlaces.has("Glückstadt")).toBe(true);
    expect(shPlaces.has("Kaltenkirchen")).toBe(true);
    expect(shPlaces.has("Hasloh")).toBe(true);
  });
});
