import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { listExpiringClubContracts } from "./expiring-contracts.ts";

describe("listExpiringClubContracts", () => {
  it("returns up to three squad players under twelve months", () => {
    const player = clonePlayer();
    player.club_id = "cl_fc_nordstern";
    player.squad_status = "pro";
    player.contract = { ...player.contract!, until_season: 1 };

    const list = listExpiringClubContracts([player], "cl_fc_nordstern", 1, 10, 3);
    expect(list).toHaveLength(1);
    expect(list[0]!.monthsRemaining).toBeLessThanOrEqual(12);
    expect(list[0]!.monthsRemaining).toBeGreaterThan(0);
  });
});
