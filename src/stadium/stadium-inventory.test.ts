import { describe, expect, it } from "vitest";
import { emptyPrecinct, placePrecinctBuilding } from "./precinct.ts";
import { stadiumInventoryCaption } from "./stadium-inventory.ts";

describe("stadium inventory furniture (PRD 14.7)", () => {
  it("starts hungry and fills the kiosk line after placing the stall", () => {
    expect(stadiumInventoryCaption([], 1)).toBe(
      "noch 6 Banden frei · Trikot ohne Brustlogo · Wurstbude unbesetzt",
    );
    const withKiosk = placePrecinctBuilding(emptyPrecinct(), 0, 0, "kiosk");
    expect(stadiumInventoryCaption([], 1, withKiosk)).toContain("Wurstbude offen");
  });
});
