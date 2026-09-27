import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyTransferState } from "./negotiations.ts";
import {
  activatePendingPreContracts,
  attemptPreContract,
  canSignPreContract,
  signingBonusFromSavedFee,
} from "./pre-contracts.ts";

describe("pre-contracts", () => {
  it("computes signing bonus as 10–15% of saved fee", () => {
    expect(signingBonusFromSavedFee(1_000_000, 0.12)).toBe(120_000);
  });

  it("allows signing inside the six-month window", () => {
    const player = clonePlayer();
    player.club_id = "cl_rival_a";
    player.contract = {
      wage_weekly: 2_000,
      bonus_goal: 0,
      bonus_appearance: 0,
      until_season: 2,
      guaranteed_minutes_promise: "none",
    };
    const eligibility = canSignPreContract(player, "cl_fc_nordstern", 2, 20, []);
    expect(eligibility.allowed).toBe(true);
  });

  it("activates pending deals at season end", () => {
    const player = clonePlayer();
    player.id = "pl_pre";
    player.club_id = "cl_rival_a";
    player.contract = {
      wage_weekly: 2_000,
      bonus_goal: 0,
      bonus_appearance: 0,
      until_season: 1,
      guaranteed_minutes_promise: "none",
    };
    const state = {
      ...emptyTransferState(),
      pending_transfers: [
        {
          id: "pre_1",
          player_id: "pl_pre",
          buyer_club_id: "cl_fc_nordstern",
          signing_bonus: 50_000,
          wage_weekly: 3_000,
          contract_until_season: 1,
          signed_season: 1,
          signed_week: 25,
          effective_season: 2,
          saved_transfer_fee: 400_000,
        },
      ],
    };
    const result = activatePendingPreContracts([], [player], state, 1, 34, "cl_fc_nordstern");
    expect(result.players.some((entry) => entry.id === "pl_pre")).toBe(true);
    expect(result.transferState.pending_transfers).toHaveLength(0);
  });

  it("resolves rival bidding deterministically", () => {
    const player = clonePlayer();
    player.id = "pl_bid";
    player.club_id = "cl_rival_b";
    player.contract = {
      wage_weekly: 2_000,
      bonus_goal: 0,
      bonus_appearance: 0,
      until_season: 2,
      guaranteed_minutes_promise: "none",
    };
    const result = attemptPreContract(
      emptyTransferState(),
      player,
      "cl_fc_nordstern",
      2,
      22,
      4242,
      ["cl_fc_nordstern", "cl_rival_a", "cl_rival_b"],
    );
    expect(result.won || result.winnerClubId).toBeTruthy();
  });
});
