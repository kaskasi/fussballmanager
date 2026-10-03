import { describe, expect, it } from "vitest";
import {
  PRECINCT_HEIGHT,
  PRECINCT_PARCEL_COST,
  PRECINCT_STADIUM,
  PRECINCT_WIDTH,
  buyPrecinctParcel,
  canBuyPrecinctParcel,
  canPlacePrecinctBuilding,
  countBuilding,
  emptyPrecinct,
  expandPrecinctPatch,
  findBuildingCell,
  isOwnedCell,
  isPrecinctStadiumCell,
  normalizePrecinct,
  occupiedCells,
  patchTouchesStreet,
  placePrecinctBuilding,
  placeStreet,
  precinctBuildingLevel,
  precinctHasTrainingHall,
  precinctPlacementCost,
  upgradePrecinctBuilding,
} from "./precinct.ts";

describe("precinct grid", () => {
  it("uses a 12×10 board with a locked outer ring", () => {
    const grid = emptyPrecinct();
    expect(grid.width).toBe(PRECINCT_WIDTH);
    expect(grid.height).toBe(PRECINCT_HEIGHT);
    expect(isOwnedCell(grid, 0, 0)).toBe(false);
    expect(isOwnedCell(grid, 1, 1)).toBe(true);
    expect(isPrecinctStadiumCell(PRECINCT_STADIUM.x, PRECINCT_STADIUM.y)).toBe(true);
    expect(isPrecinctStadiumCell(0, 0)).toBe(false);
  });

  it("lets you stack kiosks and only moves unique buildings", () => {
    let grid = emptyPrecinct();
    grid = placePrecinctBuilding(grid, 8, 1, "kiosk");
    grid = placePrecinctBuilding(grid, 8, 7, "kiosk");
    expect(countBuilding(grid, "kiosk")).toBe(2);
    expect(occupiedCells(grid, "kiosk")).toBe(2);

    grid = placePrecinctBuilding(grid, 1, 1, "fanshop");
    expect(findBuildingCell(grid, "fanshop")).toEqual({ x: 1, y: 1 });
    expect(occupiedCells(grid, "fanshop")).toBe(4);
    grid = placePrecinctBuilding(grid, 1, 6, "fanshop");
    expect(findBuildingCell(grid, "fanshop")).toEqual({ x: 1, y: 6 });
    expect(countBuilding(grid, "fanshop")).toBe(1);
  });

  it("reserves the stadium block and refuses locked parcels", () => {
    expect(placePrecinctBuilding(emptyPrecinct(), PRECINCT_STADIUM.x, PRECINCT_STADIUM.y, "kiosk").patches).toHaveLength(0);
    expect(canPlacePrecinctBuilding(emptyPrecinct(), 0, 0, "kiosk")).toBe(false);
  });

  it("charges every extra kiosk but unique moves are free", () => {
    const empty = emptyPrecinct();
    expect(precinctPlacementCost(empty, "kiosk")).toBe(95_000);
    const placed = placePrecinctBuilding(empty, 1, 1, "kiosk");
    expect(precinctPlacementCost(placed, "kiosk")).toBe(95_000);
    const shop = placePrecinctBuilding(empty, 1, 1, "fanshop");
    expect(precinctPlacementCost(shop, "fanshop")).toBe(0);
  });

  it("upgrades the training ground into a hall", () => {
    let grid = placePrecinctBuilding(emptyPrecinct(), 1, 1, "training_ground");
    expect(occupiedCells(grid, "training_ground")).toBe(9);
    expect(precinctBuildingLevel(grid, "training_ground")).toBe(1);
    expect(precinctHasTrainingHall(grid)).toBe(false);
    grid = upgradePrecinctBuilding(grid, "training_ground");
    expect(precinctBuildingLevel(grid, "training_ground")).toBe(2);
    expect(precinctHasTrainingHall(grid)).toBe(true);
  });

  it("grows a unique building across owned cells", () => {
    const shop = placePrecinctBuilding(emptyPrecinct(), 1, 1, "fanshop");
    const grown = expandPrecinctPatch(shop, shop.patches[0]!.id, 3, 2);
    expect(occupiedCells(grown, "fanshop")).toBe(6);
  });

  it("sells adjacent locked parcels only", () => {
    const empty = emptyPrecinct();
    expect(canBuyPrecinctParcel(empty, 0, 1, PRECINCT_PARCEL_COST).allowed).toBe(true);
    expect(canBuyPrecinctParcel(empty, 0, 0, PRECINCT_PARCEL_COST).allowed).toBe(false);
    const bought = buyPrecinctParcel(empty, 0, 1);
    expect(isOwnedCell(bought, 0, 1)).toBe(true);
    expect(canBuyPrecinctParcel(bought, 0, 0, PRECINCT_PARCEL_COST).allowed).toBe(true);
  });

  it("docks bus and rail onto a gifted street after normalize", () => {
    const bus = normalizePrecinct(placePrecinctBuilding(emptyPrecinct(), 1, 1, "bus"));
    expect(patchTouchesStreet(bus, "bus")).toBe(true);
    const withStreet = placeStreet(placePrecinctBuilding(emptyPrecinct(), 8, 1, "transit"), 10, 1);
    expect(patchTouchesStreet(withStreet, "transit")).toBe(true);
  });

  it("migrates an 8×6 cell save onto the owned core", () => {
    const migrated = normalizePrecinct({
      width: 8,
      height: 6,
      patches: [],
      owned: {},
      streets: {},
      levels: { kiosk: 1 },
      cells: { "0,0": "kiosk", "1,0": "kiosk", "0,1": "fanshop" },
    });
    expect(countBuilding(migrated, "kiosk")).toBe(2);
    expect(countBuilding(migrated, "fanshop")).toBe(1);
    expect(findBuildingCell(migrated, "kiosk")).toEqual({ x: 2, y: 2 });
    expect(findBuildingCell(migrated, "fanshop")).toEqual({ x: 2, y: 3 });
    expect(occupiedCells(migrated, "fanshop")).toBe(4);
  });
});
