import { describe, expect, it } from "vitest";
import { cityPlaceGroupsOnMap, layoutForZone } from "./scout-map-layout.ts";
import type { ScoutMapClubPin } from "./scout-region-map.ts";

function pin(overrides: Partial<ScoutMapClubPin> & Pick<ScoutMapClubPin, "careerClubId" | "shortName">): ScoutMapClubPin {
  return {
    name: overrides.name ?? `Club ${overrides.shortName}`,
    place: overrides.place ?? "Bremen",
    directoryVisible: true,
    discovered: false,
    poolCount: 0,
    poolExpected: 0,
    poolPct: 0,
    scoutProgress: null,
    ...overrides,
  };
}

describe("cityPlaceGroupsOnMap", () => {
  it("groups directory-visible clubs by place with shared map coords", () => {
    const layout = layoutForZone("hanse")!;
    const clubs: ScoutMapClubPin[] = [
      pin({ careerClubId: "a", shortName: "AA", place: "Bremen", name: "Verein A" }),
      pin({ careerClubId: "b", shortName: "BB", place: "Bremen", name: "Verein B" }),
      pin({ careerClubId: "c", shortName: "HH", place: "Hamburg", name: "Verein C" }),
      pin({ careerClubId: "hidden", shortName: "XX", place: "Stade", directoryVisible: false }),
    ];
    const groups = cityPlaceGroupsOnMap(layout, clubs);
    expect(groups.map((g) => g.place)).toEqual(["Bremen", "Hamburg"]);
    const bremen = groups.find((g) => g.place === "Bremen");
    expect(bremen?.clubs).toHaveLength(2);
    expect(bremen?.clubs.map((c) => c.shortName)).toEqual(["AA", "BB"]);
    expect(bremen?.x).toBeGreaterThan(0);
    expect(bremen?.y).toBeGreaterThan(0);
  });
});
