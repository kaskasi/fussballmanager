import { describe, expect, it } from "vitest";
import {
  emptyPrecinct,
  findBuildingCell,
  isPrecinctStadiumCell,
  placePrecinctBuilding,
  precinctPlacementCost,
} from "./precinct.ts";

describe("precinct grid", () => {
  it("places each building once and moves it", () => {
    let grid = emptyPrecinct();
    grid = placePrecinctBuilding(grid, 1, 2, "kiosk");
    expect(findBuildingCell(grid, "kiosk")).toEqual({ x: 1, y: 2 });
    grid = placePrecinctBuilding(grid, 4, 5, "kiosk");
    expect(findBuildingCell(grid, "kiosk")).toEqual({ x: 4, y: 5 });
    expect(Object.keys(grid.cells)).toHaveLength(1);
  });

  it("reserves the stadium block in the centre", () => {
    expect(isPrecinctStadiumCell(3, 2)).toBe(true);
    expect(isPrecinctStadiumCell(0, 0)).toBe(false);
    const grid = placePrecinctBuilding(emptyPrecinct(), 3, 2, "kiosk");
    expect(findBuildingCell(grid, "kiosk")).toBeNull();
  });

  it("charges only the first placement", () => {
    const empty = emptyPrecinct();
    expect(precinctPlacementCost(empty, "kiosk")).toBe(95_000);
    const placed = placePrecinctBuilding(empty, 0, 0, "kiosk");
    expect(precinctPlacementCost(placed, "kiosk")).toBe(0);
  });
});
