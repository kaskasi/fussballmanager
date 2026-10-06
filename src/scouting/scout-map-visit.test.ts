import { describe, expect, it } from "vitest";
import {
  applyMapClubVisitToEstimate,
  MAP_CLUB_VISIT_MIN_UNCERTAINTY,
  unknownPlayer,
  applyObservation,
} from "./estimate-model.ts";
import { canStartClubScout, emptyDiscovery, recordMapClubVisit } from "./scout-discovery.ts";
import type { WorldClub } from "../world/world-generator.ts";

describe("map club visit knowledge", () => {
  it("reduces uncertainty by one third per visit down to floor 5", () => {
    let range = 40;
    range = applyMapClubVisitToEstimate({ estimatedAbilityMean: 65, uncertaintyRange: range, sampleSize: 0 })
      .uncertaintyRange;
    expect(range).toBe(26);
    range = applyMapClubVisitToEstimate({ estimatedAbilityMean: 65, uncertaintyRange: range, sampleSize: 1 })
      .uncertaintyRange;
    expect(range).toBe(17);
    range = applyMapClubVisitToEstimate({ estimatedAbilityMean: 65, uncertaintyRange: range, sampleSize: 2 })
      .uncertaintyRange;
    expect(range).toBe(11); // floor(11.33)
    range = applyMapClubVisitToEstimate({ estimatedAbilityMean: 65, uncertaintyRange: range, sampleSize: 3 })
      .uncertaintyRange;
    expect(range).toBe(7);
    range = applyMapClubVisitToEstimate({ estimatedAbilityMean: 65, uncertaintyRange: range, sampleSize: 4 })
      .uncertaintyRange;
    expect(range).toBe(MAP_CLUB_VISIT_MIN_UNCERTAINTY);
  });

  it("supports map_club_visit observation kind", () => {
    const once = applyObservation(unknownPlayer(), "map_club_visit");
    expect(once.status === "scouted" && once.estimate.uncertaintyRange).toBe(26);
  });

  it("allows re-scouting a visited club when directory-visible", () => {
    const club = {
      id: "cl_test",
      name: "FC Test",
      short_name: "TST",
      division_id: "regionalliga-nord",
      region: "Elbmarsch",
      place: "Elmshorn",
      identity: "community",
    } as WorldClub;
    let discovery = recordMapClubVisit(emptyDiscovery(), "cl_test", []);
    expect(discovery.visited_club_ids).toContain("cl_test");
    expect(
      canStartClubScout(club, "regionalliga-nord", discovery, null, [club]),
    ).toBe(true);
  });
});
