import { describe, expect, it } from "vitest";
import { defaultClubFinances } from "../economy/club-finances.ts";
import {
  cannotOpenPurchaseReason,
  cannotPayTransferFeeReason,
  cannotSubmitPurchaseOfferReason,
} from "./purchase-block.ts";

describe("purchase block reasons", () => {
  it("names a closed transfer window only when submitting", () => {
    expect(cannotOpenPurchaseReason(6, true)).toBeNull();
    expect(cannotSubmitPurchaseOfferReason(6, true)).toMatch(/Transferfenster zu/);
    expect(cannotSubmitPurchaseOfferReason(1, true)).toBeNull();
  });

  it("names a missing scout target", () => {
    expect(cannotOpenPurchaseReason(35, false)).toMatch(/kein Scout-Ziel/);
  });

  it("separates cash from the transfer pot", () => {
    const finances = { ...defaultClubFinances(), cash: 4_500_000, transfer_budget: 1_800_000 };
    expect(cannotPayTransferFeeReason(finances, 1_000_000)).toBeNull();
    expect(cannotPayTransferFeeReason(finances, 2_200_000)).toMatch(/Topf nicht/);
    expect(cannotPayTransferFeeReason({ ...finances, cash: 50_000, transfer_budget: 40_000 }, 80_000)).toMatch(
      /benötigt/,
    );
  });
});
