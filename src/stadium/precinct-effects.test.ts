import { describe, expect, it } from "vitest";
import {
  listPrecinctStatusEffects,
  precinctFillRateBonus,
  precinctFitnessRegen,
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
    expect(precinctWeeklyFanbaseBonus(shop, 0.5)).toBeCloseTo(precinctWeeklyFanbaseBonus(shop) * 0.5);
  });

  it("pays docked kiosks independently — occupancy scales, stands do not share a sausage pie", () => {
    expect(weeklyKioskIncome(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "kiosk"))).toBe(0);
    let kiosk = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "kiosk"), "kiosk");
    expect(weeklyKioskIncome(kiosk)).toBe(1_000);
    expect(weeklyKioskIncome(kiosk, 0.5)).toBe(500);
    kiosk = upgradePrecinctBuilding(kiosk, "kiosk");
    expect(weeklyKioskIncome(kiosk)).toBeGreaterThan(1_000);
    const tent = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "beer_tent"), "beer_tent");
    expect(weeklyBeerIncome(tent)).toBe(3_600);
    expect(listPrecinctStatusEffects(kiosk).find((entry) => entry.id === "kiosk")?.magnitude).toBe("€ 1k");
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

  it("raises training environment from campus upgrades", () => {
    let ground = dockToCity(
      placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "training_ground"),
      "training_ground",
    );
    expect(precinctTrainingEnvironment(ground)).toBeGreaterThan(1);
    const base = precinctTrainingEnvironment(ground);
    ground = upgradePrecinctBuilding(ground, "training_ground");
    expect(precinctTrainingEnvironment(ground)).toBeGreaterThan(base);
  });

  it("sells more merch when fanbase is higher at the same occupancy", () => {
    const shop = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "fanshop"), "fanshop");
    const low = weeklyFanshopIncome(shop, 0.5, 35, true);
    const high = weeklyFanshopIncome(shop, 0.5, 90, true);
    expect(high).toBeGreaterThan(low);
  });

  it("rewards bus plus fan services on away weeks", () => {
    let state = dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "bus"), "bus");
    state = dockToCity(placePrecinctBuilding(state, FARM_X + 3, FARM_Y, "fan_services"), "fan_services");
    const kiosk = dockToCity(placePrecinctBuilding(state, FARM_X, FARM_Y + 2, "kiosk"), "kiosk");
    const awayOrganized = weeklyKioskIncome(kiosk, 0.1, 60, false);
    expect(awayOrganized).toBeGreaterThan(
      weeklyKioskIncome(
        dockToCity(placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y + 2, "kiosk"), "kiosk"),
        0.1,
        60,
        false,
      ),
    );
  });

  it("adds recovery from Fitness, Pool — not from Halle alone", () => {
    let ground = dockToCity(
      placePrecinctBuilding(emptyPrecinct(), FARM_X, FARM_Y, "training_ground"),
      "training_ground",
    );
    ground = upgradePrecinctBuilding(ground, "training_ground");
    expect(precinctFitnessRegen(ground)).toBe(1);
    ground = upgradePrecinctBuilding(ground, "training_ground");
    expect(precinctFitnessRegen(ground)).toBeCloseTo(1.05, 2);
    ground = upgradePrecinctBuilding(ground, "training_ground");
    expect(precinctFitnessRegen(ground)).toBeCloseTo(1.16, 2);
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
