import { describe, expect, it } from "vitest";
import { emptyPrecinct, placePrecinctBuilding } from "./precinct.ts";
import { stadiumInventoryCaption } from "./stadium-inventory.ts";
import { unlockedSponsorSlots } from "./sponsor-deals.ts";

describe("stadium inventory furniture (PRD 14.7)", () => {
  it("starts hungry and fills the kiosk line after placing the stall", () => {
    expect(stadiumInventoryCaption([], 1)).toBe(
      "noch 6 Banden frei · Trikot ohne Brustlogo · Wurstbude unbesetzt",
    );
    const withKiosk = placePrecinctBuilding(emptyPrecinct(), 2, 1, "kiosk");
    expect(stadiumInventoryCaption([], 1, withKiosk)).toContain("Wurstbude offen");
  });

  it("unlocks extra boards after standing and seating expansions", () => {
    expect(unlockedSponsorSlots().filter((slot) => slot.kind === "board")).toHaveLength(6);
    const standing = unlockedSponsorSlots({ standing_expansion: 2 }).filter(
      (slot) => slot.kind === "board",
    );
    expect(standing).toHaveLength(10);
    expect(stadiumInventoryCaption([], 1, undefined, { standing_expansion: 1, seating_expansion: 1 })).toContain(
      "noch 10 Banden frei",
    );
  });
});

