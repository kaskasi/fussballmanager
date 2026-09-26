import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { refreshPlayerMarketValue } from "./refresh-market-values.ts";

describe("refresh market values", () => {
  it("updates market_value when attributes change", () => {
    const player = clonePlayer();
    const before = player.market_value;
    player.attributes.passing = 95;
    const updated = refreshPlayerMarketValue(player, 1);
    expect(updated.market_value).toBeGreaterThan(before);
  });
});
