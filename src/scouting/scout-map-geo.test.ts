import { describe, expect, it } from "vitest";
import { buildZoneMapNodes, layoutForZone } from "./scout-map-layout.ts";
import {
  geoToReliefSvg,
  mapCoordsForPlace,
  parseSvgViewBox,
  reliefViewBoxForZoneClubs,
} from "./scout-map-geo.ts";
import type { ScoutMapClubPin } from "./scout-region-map.ts";
import { generateWorld } from "../world/world-generator.ts";

describe("scout-map-geo", () => {
  it("projects SH cities into the dynamic relief clip for zone clubs", () => {
    const world = generateWorld(4242);
    const layout = layoutForZone("sh");
    expect(layout).toBeDefined();
    const viewBox = reliefViewBoxForZoneClubs("sh", world.clubs);
    const { x: vbX, y: vbY, w: vbW, h: vbH } = parseSvgViewBox(viewBox);
    for (const city of ["Elmshorn", "Glückstadt", "Kaltenkirchen", "Hasloh"]) {
      const coords = mapCoordsForPlace(city, layout!);
      expect(coords).not.toBeNull();
      expect(coords!.x).toBeGreaterThanOrEqual(vbX - 24);
      expect(coords!.x).toBeLessThanOrEqual(vbX + vbW + 24);
      expect(coords!.y).toBeGreaterThanOrEqual(vbY - 24);
      expect(coords!.y).toBeLessThanOrEqual(vbY + vbH + 24);
    }
  });

  it("places Bremen on the Bremen street-map canvas", () => {
    const layout = layoutForZone("hanse");
    expect(layout?.mapMode).toBe("city");
    const bremen = mapCoordsForPlace("Bremen", layout!);
    const { x: vx, y: vy, w: vw, h: vh } = parseSvgViewBox(layout!.citySvgViewBox!);
    expect(bremen!.x).toBeGreaterThan(vx);
    expect(bremen!.x).toBeLessThan(vx + vw);
    expect(bremen!.y).toBeGreaterThan(vy);
    expect(bremen!.y).toBeLessThan(vy + vh);
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
