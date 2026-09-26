import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  achievementBadges,
  contractView,
  flavorForScout,
  generatePlayerFlavor,
  seasonStatsStub,
} from "./player-flavor.ts";

describe("player flavor", () => {
  const player = clonePlayer();

  it("generates deterministic flavor text", () => {
    const first = generatePlayerFlavor(player);
    const second = generatePlayerFlavor(player);
    expect(first).toEqual(second);
    expect(first.headline.length).toBeGreaterThan(0);
    expect(first.body.length).toBeGreaterThan(20);
  });

  it("hides flavor for unknown foreign players", () => {
    expect(flavorForScout(player, false, { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 })).toBeNull();
  });

  it("shows vague flavor before full scout knowledge", () => {
    const vague = flavorForScout(player, false, { estimatedAbilityMean: 65, uncertaintyRange: 28, sampleSize: 1 });
    expect(vague?.traits).toHaveLength(1);
    const known = flavorForScout(player, false, { estimatedAbilityMean: 65, uncertaintyRange: 8, sampleSize: 3 });
    expect(known?.traits.length).toBeGreaterThan(1);
  });

  it("builds stub stats and contract views", () => {
    expect(seasonStatsStub(player, true)?.apps).toBeGreaterThan(0);
    expect(seasonStatsStub(player, false, { estimatedAbilityMean: 65, uncertaintyRange: 30, sampleSize: 0 })).toBeNull();
    expect(contractView(player, true).status).toBe("Profivertrag");
    expect(achievementBadges(player, true).length).toBeGreaterThan(0);
  });
});
