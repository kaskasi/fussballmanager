import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceWeeklyClubFinances,
  applyTransferFee,
  canAffordTransfer,
  defaultClubFinances,
  formatClubCash,
  weeklyWageBill,
} from "./club-finances.ts";

describe("club finances", () => {
  it("sums weekly wages for owned players", () => {
    const player = clonePlayer();
    player.club_id = "cl_fc_nordstern";
    player.contract = { ...player.contract!, wage_weekly: 1_000 };
    expect(weeklyWageBill([player], "cl_fc_nordstern")).toBe(1_000);
  });

  it("applies sponsorship income and wage costs each week", () => {
    const player = clonePlayer();
    player.club_id = "cl_fc_nordstern";
    player.contract = { ...player.contract!, wage_weekly: 5_000 };
    const next = advanceWeeklyClubFinances(defaultClubFinances(), [player], "cl_fc_nordstern");
    expect(next.cash).toBe(defaultClubFinances().cash + 55_000 - 5_000);
  });

  it("blocks transfers above available cash", () => {
    const finances = { cash: 500_000 };
    expect(canAffordTransfer(finances, 400_000)).toBe(true);
    expect(canAffordTransfer(finances, 600_000)).toBe(false);
    expect(applyTransferFee(finances, 400_000).cash).toBe(100_000);
  });

  it("formats cash for the UI", () => {
    expect(formatClubCash(6_000_000)).toContain("Mio.");
    expect(formatClubCash(12_500)).toContain("k");
  });
});
