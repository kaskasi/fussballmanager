import { describe, expect, it } from "vitest";
import { defaultClubStadium } from "../stadium/club-stadium.ts";
import {
  constructionCapacitySummary,
  listActiveConstructionProjects,
} from "./construction-capacity.ts";
import { BASE_CONCURRENT_PROJECTS } from "./advance-construction.ts";
import { emptyPrecinct, placePrecinctBuilding } from "../stadium/precinct.ts";
import { maxConcurrentConstructionProjects } from "./construction-capacity.ts";

describe("construction capacity display", () => {
  it("lists each satellite camp under construction toward the club cap", () => {
    const snapshot = {
      precinct: undefined,
      stadium: defaultClubStadium(),
      camps: [
        { id: "camp_pt", staffed: false, purchased_season: 1, construction_until: 99 },
        { id: "camp_br", staffed: false, purchased_season: 1, construction_until: 100 },
      ],
      academyProject: null,
      season: 1,
      week: 3,
    };
    const projects = listActiveConstructionProjects(snapshot);
    expect(projects).toHaveLength(2);
    expect(projects.every((entry) => entry.kind === "camp")).toBe(true);
    const summary = constructionCapacitySummary(snapshot);
    expect(summary.active).toBe(BASE_CONCURRENT_PROJECTS);
    expect(summary.atCap).toBe(true);
  });

  it("raises the cap when Vereinsgebäude is built and upgraded", () => {
    const base = {
      precinct: undefined,
      stadium: defaultClubStadium(),
      camps: [] as const,
      academyProject: null,
      season: 1,
      week: 1,
    };
    expect(maxConcurrentConstructionProjects(base)).toBe(2);

    let precinct = placePrecinctBuilding(emptyPrecinct(), 5, 2, "clubhouse");
    precinct = { ...precinct, levels: { ...precinct.levels, clubhouse: 1 } };
    const withHq = { ...base, precinct };
    expect(maxConcurrentConstructionProjects(withHq)).toBe(3);

    precinct = { ...precinct, levels: { ...precinct.levels, clubhouse: 2 } };
    expect(maxConcurrentConstructionProjects({ ...base, precinct })).toBe(4);
  });
});
