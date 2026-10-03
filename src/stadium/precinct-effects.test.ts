import { describe, expect, it } from "vitest";
import {
  listPrecinctStatusEffects,
  precinctFillRateBonus,
  precinctMerchCogsMultiplier,
  precinctTrainingEnvironment,
  precinctWeeklyFanbaseBonus,
  weeklyBeerIncome,
  weeklyFanshopIncome,
  weeklyKioskIncome,
} from "./precinct-effects.ts";
import {
  emptyPrecinct,
  expandPrecinctPatch,
  PRECINCT_BUILDINGS,
  PRECINCT_CORE,
  pathBuildingToCity,
  placePrecinctBuilding,
  placeStreetRun,
  type PrecinctBuilding,
  type PrecinctState,
  upgradePrecinctBuilding,
} from "./precinct.ts";

const FARM_X = PRECINCT_CORE.x;
const FARM_Y = 1;

function dockToCity(state: PrecinctState, building: PrecinctBuilding): PrecinctState {
  const path = pathBuildingToCity(state, building);
  if (!path || path.length === 0) return state;
  return placeStreetRun(state, path, 1_000_000).state;
}

describe("precinct campus effects", () => {
  it("raises fill from transit more than from the cheaper bus stop", () => {
    const bus = placePrecinctBuilding(emptyPrecinct(), 7, 0, "bus");
    const rail = placePrecinctBuilding(emptyPrecinct(), 7, 0, "transit");
    expect(precinctFillRateBonus(rail)).toBeGreaterThan(precinctFillRateBonus(bus));
    expect(precinctFillRateBonus(bus)).toBeGreaterThan(0);
    expect(precinctFillRateBonus(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "bus"))).toBe(0);
  });

  it("cheapens merch and grows fanbase when the fanshop is upgraded", () => {
    let shop = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop"), "fanshop");
    const firstMargin = weeklyFanshopIncome(shop);
    const firstCogs = precinctMerchCogsMultiplier(shop);
    shop = upgradePrecinctBuilding(shop, "fanshop");
    expect(precinctMerchCogsMultiplier(shop)).toBeLessThan(firstCogs);
    expect(weeklyFanshopIncome(shop)).toBeGreaterThan(firstMargin);
    expect(precinctWeeklyFanbaseBonus(shop)).toBeGreaterThan(0);
  });

  it("pays weekly cash from docked kiosks and beer tents", () => {
    expect(weeklyKioskIncome(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "kiosk"))).toBe(0);
    const kiosk = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "kiosk"), "kiosk");
    expect(weeklyKioskIncome(kiosk)).toBe(500);
    const tent = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "beer_tent"), "beer_tent");
    expect(weeklyBeerIncome(tent)).toBe(1_800);
    expect(listPrecinctStatusEffects(kiosk).find((entry) => entry.id === "kiosk")?.magnitude).toBe("€ 500");
  });

  it("lets a grown parking lot keep adding fill without a cap", () => {
    const lot = placePrecinctBuilding(emptyPrecinct(), FARM_X, 6, "parking");
    const grown = dockToCity(expandPrecinctPatch(lot, lot.patches[0]!.id, 8, 4), "parking");
    expect(precinctFillRateBonus(grown)).toBeGreaterThan(0.04);
  });

  it("pays more merch when the shop occupies more land", () => {
    const shop = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop"), "fanshop");
    const placed = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop");
    const grown = dockToCity(expandPrecinctPatch(placed, placed.patches[0]!.id, 3, 3), "fanshop");
    expect(weeklyFanshopIncome(grown)).toBeGreaterThan(weeklyFanshopIncome(shop));
  });

  it("lets fan services raise both fill and weekly fanbase", () => {
    const loose = placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fan_services");
    expect(precinctFillRateBonus(loose)).toBe(0);
    expect(precinctWeeklyFanbaseBonus(loose)).toBe(0);
    const docked = dockToCity(loose, "fan_services");
    expect(precinctFillRateBonus(docked)).toBeGreaterThan(0);
    expect(precinctWeeklyFanbaseBonus(docked)).toBeGreaterThan(0);
  });

  it("boosts training more after the hall upgrade", () => {
    let ground = dockToCity(
      placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "training_ground"),
      "training_ground",
    );
    const outdoor = precinctTrainingEnvironment(ground);
    ground = upgradePrecinctBuilding(ground, "training_ground");
    expect(precinctTrainingEnvironment(ground)).toBeGreaterThan(outdoor);
  });

  it("lists every campus building as a buff, hunger, or undocked warning", () => {
    const empty = listPrecinctStatusEffects(emptyPrecinct());
    expect(empty).toHaveLength(PRECINCT_BUILDINGS.length + 1);
    expect(empty.find((entry) => entry.id === "arena")?.tone).toBe("buff");
    expect(empty.filter((entry) => entry.tone === "hunger")).toHaveLength(PRECINCT_BUILDINGS.length);

    const looseKiosk = listPrecinctStatusEffects(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "kiosk"));
    expect(looseKiosk.find((entry) => entry.id === "kiosk")?.tone).toBe("warn");
    expect(looseKiosk.find((entry) => entry.id === "arena")?.tone).toBe("buff");

    const looseBus = listPrecinctStatusEffects(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "bus"));
    expect(looseBus.find((entry) => entry.id === "bus")?.tone).toBe("warn");

    const docked = placePrecinctBuilding(emptyPrecinct(), 7, 0, "bus");
    const live = listPrecinctStatusEffects(docked);
    expect(live.find((entry) => entry.id === "bus")?.tone).toBe("buff");
    expect(live.find((entry) => entry.id === "bus")?.magnitude).toBe("+1,8%");
    expect(live.find((entry) => entry.id === "arena")?.tone).toBe("buff");
    expect(live.filter((entry) => entry.tone === "hunger").length).toBe(PRECINCT_BUILDINGS.length - 1);
  });
});
