import { describe, expect, it } from "vitest";
import { defaultClubFinances } from "../economy/club-finances.ts";
import {
  defaultClubStadium,
  normalizeClubStadium,
  stadiumTotalCapacity,
  STADIUM_BASE_BLOCKS,
} from "./club-stadium.ts";
import {
  canPurchaseStadiumUpgrade,
  purchaseStadiumUpgrade,
  stadiumUpgradeLevel,
} from "./stadium-upgrades.ts";

describe("stadium upgrades", () => {
  it("increases standing capacity when purchased", () => {
    const stadium = defaultClubStadium();
    const finances = { ...defaultClubFinances(), cash: 2_000_000 };
    const result = purchaseStadiumUpgrade(
      stadium,
      finances,
      "standing_expansion",
      STADIUM_BASE_BLOCKS,
    );
    expect(result.ok).toBe(true);
    const normalized = normalizeClubStadium(result.stadium);
    expect(stadiumUpgradeLevel(normalized, "standing_expansion")).toBe(1);
    expect(stadiumTotalCapacity(normalized)).toBeGreaterThan(stadiumTotalCapacity(stadium));
  });

  it("refuses purchase without enough cash", () => {
    const stadium = defaultClubStadium();
    const finances = { ...defaultClubFinances(), cash: 1_000 };
    const check = canPurchaseStadiumUpgrade(stadium, finances, "vip_expansion");
    expect(check.allowed).toBe(false);
  });
});
