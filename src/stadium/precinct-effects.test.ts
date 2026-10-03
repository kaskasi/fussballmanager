import { describe, expect, it } from "vitest";
import {
  precinctFillRateBonus,
  precinctMerchCogsMultiplier,
  precinctTrainingEnvironment,
  precinctWeeklyFanbaseBonus,
  weeklyFanshopIncome,
} from "./precinct-effects.ts";
import {
  emptyPrecinct,
  expandPrecinctPatch,
  normalizePrecinct,
  placePrecinctBuilding,
  upgradePrecinctBuilding,
} from "./precinct.ts";

describe("precinct campus effects", () => {
  it("raises fill from transit more than from the cheaper bus stop", () => {
    const bus = normalizePrecinct(placePrecinctBuilding(emptyPrecinct(), 1, 1, "bus"));
    const rail = normalizePrecinct(placePrecinctBuilding(emptyPrecinct(), 1, 1, "transit"));
    expect(precinctFillRateBonus(rail)).toBeGreaterThan(precinctFillRateBonus(bus));
    expect(precinctFillRateBonus(bus)).toBeGreaterThan(0);
  });

  it("cheapens merch and grows fanbase when the fanshop is upgraded", () => {
    let shop = placePrecinctBuilding(emptyPrecinct(), 1, 1, "fanshop");
    const firstMargin = weeklyFanshopIncome(shop);
    const firstCogs = precinctMerchCogsMultiplier(shop);
    shop = upgradePrecinctBuilding(shop, "fanshop");
    expect(precinctMerchCogsMultiplier(shop)).toBeLessThan(firstCogs);
    expect(weeklyFanshopIncome(shop)).toBeGreaterThan(firstMargin);
    expect(precinctWeeklyFanbaseBonus(shop)).toBeGreaterThan(0);
  });

  it("pays more merch when the shop occupies more land", () => {
    const shop = placePrecinctBuilding(emptyPrecinct(), 1, 1, "fanshop");
    const grown = expandPrecinctPatch(shop, shop.patches[0]!.id, 3, 3);
    expect(weeklyFanshopIncome(grown)).toBeGreaterThan(weeklyFanshopIncome(shop));
  });

  it("boosts training more after the hall upgrade", () => {
    let ground = placePrecinctBuilding(emptyPrecinct(), 1, 1, "training_ground");
    const outdoor = precinctTrainingEnvironment(ground);
    ground = upgradePrecinctBuilding(ground, "training_ground");
    expect(precinctTrainingEnvironment(ground)).toBeGreaterThan(outdoor);
  });
});
