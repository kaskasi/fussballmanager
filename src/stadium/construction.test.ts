import { describe, expect, it } from "vitest";
import { defaultClubStadium } from "./club-stadium.ts";
import { matchdayCapacity } from "./club-stadium.ts";
import { emptyPrecinct } from "./precinct.ts";
import { startPrecinctConstruction } from "./precinct-construction.ts";
import { startBlockExpansion } from "./stadium-block-expansion.ts";
import { countActiveProjects, MAX_CONCURRENT_PROJECTS } from "../sim/advance-construction.ts";

describe("construction cap and match capacity", () => {
  it("counts a new precinct build and a tribune, then blocks a third", () => {
    const precinct = startPrecinctConstruction(emptyPrecinct(), 5, 2, "kiosk", 1, 1);
    let stadium = defaultClubStadium();
    stadium = { ...stadium, precinct };
    stadium = startBlockExpansion(stadium, "north", 1, 1);
    const count = countActiveProjects({
      precinct,
      stadium,
      camps: [],
      academyProject: null,
      season: 1,
      week: 1,
    });
    expect(count).toBe(MAX_CONCURRENT_PROJECTS);
  });

  it("drops a tribune under construction and restores the expanded capacity afterwards", () => {
    const idle = defaultClubStadium();
    const before = matchdayCapacity(idle, 1, 1);
    const building = startBlockExpansion(idle, "north", 1, 1);
    const during = matchdayCapacity(building, 1, 1);
    expect(during).toBeLessThan(before);
    const finished = {
      ...building,
      block_expansion: {
        ...building.block_expansion,
        north: { level: 2 },
      },
    };
    expect(matchdayCapacity(finished, 1, 2)).toBeGreaterThan(during);
    expect(matchdayCapacity(finished, 1, 2)).toBeGreaterThan(before);
  });
});
