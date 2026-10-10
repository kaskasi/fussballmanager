import { describe, expect, it } from "vitest";
import { defaultClubStadium } from "./club-stadium.ts";
import {
  precinctMedicalCenterLevel,
  precinctInjuryRiskFactor,
  precinctTzPhysioStack,
} from "./precinct-effects.ts";
import {
  dockedOccupiedCells,
  emptyPrecinct,
  PRECINCT_CORE,
  pathBuildingToCity,
  placePrecinctBuilding,
  placeStreetRun,
  precinctBuildingLevel,
  upgradePrecinctBuilding,
} from "./precinct.ts";

const FARM_X = PRECINCT_CORE.x;
const FARM_Y = 1;
import { careerInjuryRiskFactor } from "../medical/career-injury-risk.ts";
import { defaultMedicalStaff } from "../staff/medical-staff.ts";

describe("precinct medical", () => {
  it("medical center level requires placed building", () => {
    expect(precinctMedicalCenterLevel(undefined)).toBe(0);
  });

  it("tz physio stack is 0.92 at training ground 5", () => {
    let state = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "training_ground");
    const path = pathBuildingToCity(state, "training_ground");
    if (path && path.length > 0) {
      state = placeStreetRun(state, path, 1_000_000).state;
    }
    for (let i = 0; i < 4; i++) {
      state = upgradePrecinctBuilding(state, "training_ground");
    }
    expect(precinctBuildingLevel(state, "training_ground")).toBe(5);
    expect(dockedOccupiedCells(state, "training_ground")).toBeGreaterThan(0);
    expect(precinctTzPhysioStack(state)).toBe(0.92);
  });

  it("career injury risk drops with medical building", () => {
    const stadium = defaultClubStadium();
    const base = careerInjuryRiskFactor(stadium.precinct, defaultMedicalStaff());
    let state = emptyPrecinct();
    state = placePrecinctBuilding(state, FARM_X, FARM_Y, "medical_center");
    const withMed = careerInjuryRiskFactor(state, defaultMedicalStaff());
    expect(withMed).toBeLessThanOrEqual(base);
  });
});
