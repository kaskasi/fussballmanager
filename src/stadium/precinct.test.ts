import { describe, expect, it } from "vitest";
import {
  PRECINCT_CITY_LINK,
  PRECINCT_CORE,
  PRECINCT_EXPANSION_COST,
  PRECINCT_HEIGHT,
  PRECINCT_STADIUM,
  PRECINCT_STREET_COST,
  PRECINCT_WIDTH,
  arenaDocksStreetNetwork,
  buyPrecinctExpansion,
  canBuyPrecinctExpansion,
  canNudgePrecinctPatch,
  canPlacePrecinctBuilding,
  countBuilding,
  emptyPrecinct,
  expandPrecinctPatch,
  findBuildingCell,
  isOwnedCell,
  isPrecinctStadiumCell,
  isStreetCell,
  manhattanStreetCells,
  nextPrecinctExpansion,
  normalizePrecinct,
  nudgePrecinctPatch,
  occupiedCells,
  patchDocksCityLink,
  patchDocksStreetNetwork,
  patchTouchesStreet,
  pathBuildingToCity,
  placePrecinctBuilding,
  placeStreet,
  placeStreetRun,
  precinctBuildingLevel,
  precinctExpansionOwned,
  precinctHasTrainingHall,
  precinctPlacementCost,
  precinctTrainingPitchLevel,
  precinctSpineCells,
  shrinkPrecinctPatchToMin,
  streetLinks,
  upgradePrecinctBuilding,
  removePrecinctPatch,
  removeStreetCell,
  precinctPatchRefund,
} from "./precinct.ts";

const FARM_X = PRECINCT_CORE.x;
const FARM_Y = 1;

describe("precinct grid", () => {
  it("starts as a full 18×12 owned farm with a city-to-arena road", () => {
    const grid = emptyPrecinct();
    expect(grid.width).toBe(PRECINCT_WIDTH);
    expect(grid.height).toBe(PRECINCT_HEIGHT);
    expect(isOwnedCell(grid, 0, 0)).toBe(true);
    expect(isOwnedCell(grid, FARM_X, FARM_Y)).toBe(true);
    expect(isOwnedCell(grid, PRECINCT_CITY_LINK.x, 0)).toBe(true);
    expect(isPrecinctStadiumCell(PRECINCT_STADIUM.x, PRECINCT_STADIUM.y)).toBe(true);
    expect(arenaDocksStreetNetwork(grid)).toBe(true);
    for (const cell of precinctSpineCells()) {
      expect(isStreetCell(grid, cell.x, cell.y)).toBe(true);
    }
  });

  it("lets you stack kiosks and only moves unique buildings", () => {
    let grid = emptyPrecinct();
    grid = placePrecinctBuilding(grid, 9, 1, "kiosk");
    grid = placePrecinctBuilding(grid, 9, 7, "kiosk");
    expect(countBuilding(grid, "kiosk")).toBe(2);
    expect(occupiedCells(grid, "kiosk")).toBe(2);

    grid = placePrecinctBuilding(grid, FARM_X, FARM_Y, "fanshop");
    expect(findBuildingCell(grid, "fanshop")).toEqual({ x: FARM_X, y: FARM_Y });
    expect(occupiedCells(grid, "fanshop")).toBe(4);
    grid = placePrecinctBuilding(grid, FARM_X, 6, "fanshop");
    expect(findBuildingCell(grid, "fanshop")).toEqual({ x: FARM_X, y: 6 });
    expect(countBuilding(grid, "fanshop")).toBe(1);
  });

  it("reserves the stadium block but allows building on side tiles", () => {
    expect(placePrecinctBuilding(emptyPrecinct(), PRECINCT_STADIUM.x, PRECINCT_STADIUM.y, "kiosk").patches).toHaveLength(0);
    expect(canPlacePrecinctBuilding(emptyPrecinct(), 0, 0, "kiosk")).toBe(true);
  });

  it("charges every extra kiosk but unique moves are free", () => {
    const empty = emptyPrecinct();
    expect(precinctPlacementCost(empty, "kiosk")).toBe(95_000);
    const placed = placePrecinctBuilding(empty, FARM_X, FARM_Y, "kiosk");
    expect(precinctPlacementCost(placed, "kiosk")).toBe(95_000);
    const shop = placePrecinctBuilding(empty, FARM_X, FARM_Y, "fanshop");
    expect(precinctPlacementCost(shop, "fanshop")).toBe(0);
  });

  it("upgrades the training ground into a hall", () => {
    let grid = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "training_ground");
    expect(occupiedCells(grid, "training_ground")).toBe(9);
    expect(precinctBuildingLevel(grid, "training_ground")).toBe(1);
    expect(precinctHasTrainingHall(grid)).toBe(false);
    grid = upgradePrecinctBuilding(grid, "training_ground");
    expect(precinctBuildingLevel(grid, "training_ground")).toBe(2);
    expect(precinctHasTrainingHall(grid)).toBe(true);
  });

  it("tracks outdoor pitch level only when docked to the street network", () => {
    let grid = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "training_pitch");
    expect(precinctTrainingPitchLevel(grid)).toBe(0);
    grid = upgradePrecinctBuilding(grid, "training_pitch");
    expect(precinctTrainingPitchLevel(grid)).toBe(0);
  });

  it("does not charge cash to nudge a building footprint", () => {
    const shop = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop");
    const check = canNudgePrecinctPatch(shop, shop.patches[0]!.id, "e", 0, 1);
    expect(check.allowed).toBe(true);
    expect(check.cost).toBe(0);
  });

  it("refunds purchase and upgrades when the last unique building is removed", () => {
    let grid = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop");
    grid = upgradePrecinctBuilding(grid, "fanshop");
    const patchId = grid.patches[0]!.id;
    expect(precinctPatchRefund(grid, grid.patches[0]!)).toBeGreaterThan(220_000);
    const removed = removePrecinctPatch(grid, patchId);
    expect(removed.refund).toBeGreaterThan(220_000);
    expect(countBuilding(removed.state, "fanshop")).toBe(0);
    expect(removed.state.levels.fanshop).toBeUndefined();
  });

  it("refunds street cells when removed", () => {
    let grid = placeStreet(emptyPrecinct(), 3, 3);
    const removed = removeStreetCell(grid, 3, 3);
    expect(removed.refund).toBe(PRECINCT_STREET_COST);
    expect(isStreetCell(removed.state, 3, 3)).toBe(false);
  });

  it("grows a unique building across owned cells", () => {
    const shop = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop");
    const grown = expandPrecinctPatch(shop, shop.patches[0]!.id, 3, 2);
    expect(occupiedCells(grown, "fanshop")).toBe(6);
  });

  it("grows west and north, not only south-east", () => {
    const shop = placePrecinctBuilding(emptyPrecinct(), 3, 2, "fanshop");
    const west = nudgePrecinctPatch(shop, shop.patches[0]!.id, "w");
    expect(findBuildingCell(west, "fanshop")).toEqual({ x: 2, y: 2 });
    expect(occupiedCells(west, "fanshop")).toBe(6);
    const north = nudgePrecinctPatch(west, west.patches[0]!.id, "n");
    expect(findBuildingCell(north, "fanshop")).toEqual({ x: 2, y: 1 });
    expect(occupiedCells(north, "fanshop")).toBe(9);
  });

  it("shrinks a grown patch back to min size", () => {
    const shop = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop");
    const grown = expandPrecinctPatch(shop, shop.patches[0]!.id, 4, 3);
    expect(occupiedCells(grown, "fanshop")).toBe(12);
    const shrunk = nudgePrecinctPatch(grown, grown.patches[0]!.id, "e", -1);
    expect(occupiedCells(shrunk, "fanshop")).toBe(9);
    const min = shrinkPrecinctPatchToMin(shrunk, shrunk.patches[0]!.id);
    expect(findBuildingCell(min, "fanshop")).toEqual({ x: FARM_X, y: FARM_Y });
    expect(occupiedCells(min, "fanshop")).toBe(4);
  });

  it("starts with the full 18×12 farm owned", () => {
    const empty = emptyPrecinct();
    expect(nextPrecinctExpansion(empty)).toBeNull();
    expect(isOwnedCell(empty, 0, 0)).toBe(true);
    expect(isOwnedCell(empty, 13, 9)).toBe(true);
    expect(isOwnedCell(empty, PRECINCT_STADIUM.x, PRECINCT_STADIUM.y)).toBe(false);
    expect(canBuyPrecinctExpansion(empty, 0).allowed).toBe(false);
  });

  it("keeps buildings on expansion tiles after normalize", () => {
    let grid = emptyPrecinct();
    grid = placePrecinctBuilding(grid, 0, 1, "kiosk");
    const next = normalizePrecinct(grid);
    expect(findBuildingCell(next, "kiosk")).toEqual({ x: 0, y: 1 });
    expect(isOwnedCell(next, 0, 1)).toBe(true);
  });

  it("does not gift a street next to a far bus", () => {
    const bus = normalizePrecinct(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "bus"));
    expect(patchTouchesStreet(bus, "bus")).toBe(false);
    expect(patchDocksCityLink(bus, "bus")).toBe(false);
  });

  it("paints a Sim City street run and auto-connects the bus to the city highway", () => {
    const painted = placeStreetRun(
      emptyPrecinct(),
      manhattanStreetCells({ x: 3, y: 7 }, { x: 3, y: 9 }),
      1_000_000,
    );
    expect(painted.spent).toBe(PRECINCT_STREET_COST * 3);
    expect(isStreetCell(painted.state, 3, 8)).toBe(true);
    expect(streetLinks(painted.state, 3, 8)).toEqual({ n: true, e: false, s: true, w: false });

    let campus = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "bus");
    const path = pathBuildingToCity(campus, "bus");
    expect(path?.length).toBeGreaterThan(0);
    const linked = placeStreetRun(campus, path ?? [], 1_000_000);
    expect(patchDocksCityLink(linked.state, "bus")).toBe(true);
  });

  it("docks the bus on the off-grid city highway, or via a street to it", () => {
    const abutting = placePrecinctBuilding(emptyPrecinct(), PRECINCT_CITY_LINK.x - 1, 0, "bus");
    expect(patchDocksCityLink(abutting, "bus")).toBe(true);

    let viaRoad = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "bus");
    viaRoad = placeStreet(viaRoad, 3, 1);
    expect(patchTouchesStreet(viaRoad, "bus")).toBe(true);
    expect(patchDocksCityLink(viaRoad, "bus")).toBe(false);

    const withStreet = placeStreet(
      placePrecinctBuilding(emptyPrecinct(), 15, 9, "transit"),
      15,
      8,
    );
    expect(patchTouchesStreet(withStreet, "transit")).toBe(true);
    expect(patchDocksCityLink(withStreet, "transit")).toBe(false);
  });

  it("allows one docked 2×2 museum on the farm", () => {
    let grid = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "museum");
    expect(grid.patches).toHaveLength(1);
    expect(grid.patches[0]?.w).toBeGreaterThanOrEqual(2);
    expect(grid.patches[0]?.h).toBeGreaterThanOrEqual(2);
    grid = placePrecinctBuilding(grid, FARM_X + 3, FARM_Y, "museum");
    expect(grid.patches.filter((patch) => patch.building === "museum")).toHaveLength(1);
  });

  it("warns off-spine buildings until they touch the city street network", () => {
    const kiosk = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "kiosk");
    expect(patchDocksStreetNetwork(kiosk, kiosk.patches[0]!)).toBe(false);
    expect(arenaDocksStreetNetwork(kiosk)).toBe(true);
    expect(arenaDocksStreetNetwork(placeStreet(emptyPrecinct(), 3, 3))).toBe(true);

    const kioskPath = pathBuildingToCity(kiosk, "kiosk");
    expect(kioskPath?.length).toBeGreaterThan(0);
    const campus = placeStreetRun(kiosk, kioskPath ?? [], 1_000_000).state;
    expect(patchDocksStreetNetwork(campus, campus.patches[0]!)).toBe(true);
  });

  it("migrates an 8×6 cell save onto the owned farm", () => {
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
    expect(findBuildingCell(migrated, "kiosk")).toEqual({ x: 5, y: 3 });
    expect(findBuildingCell(migrated, "fanshop")).toEqual({ x: 5, y: 4 });
    expect(occupiedCells(migrated, "fanshop")).toBe(4);
    expect(arenaDocksStreetNetwork(migrated)).toBe(true);
  });

  it("shifts a 12×10 campus onto the 18-wide farm", () => {
    const migrated = normalizePrecinct({
      width: 12,
      height: 10,
      patches: [{ id: "pt_kiosk_1_1", building: "kiosk", x: 1, y: 1, w: 1, h: 1 }],
      owned: { "1,1": true, "0,1": true },
      streets: { "5,0": true, "5,1": true },
      levels: { kiosk: 1 },
    });
    expect(migrated.width).toBe(18);
    expect(findBuildingCell(migrated, "kiosk")).toEqual({ x: 4, y: 2 });
    expect(isOwnedCell(migrated, 0, 1)).toBe(true);
    expect(isStreetCell(migrated, PRECINCT_CITY_LINK.x, 0)).toBe(true);
    expect(arenaDocksStreetNetwork(migrated)).toBe(true);
  });
});
