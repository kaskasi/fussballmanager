import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { defaultClubFinances } from "../economy/club-finances.ts";
import { negotiationGates } from "./negotiation-readiness.ts";

describe("negotiationGates", () => {
  it("skips scout and transfer pot for sale negotiations", () => {
    const player = clonePlayer();
    player.market_value = 2_000_000;
    const gates = negotiationGates({
      week: 10,
      player,
      estimate: undefined,
      season: 1,
      finances: defaultClubFinances(),
      offerFee: 5_000_000,
      transferWindowOpen: true,
      isSale: true,
    });
    expect(gates.find((gate) => gate.id === "scout")?.ok).toBe(true);
    expect(gates.find((gate) => gate.id === "budget")?.ok).toBe(true);
  });
});
