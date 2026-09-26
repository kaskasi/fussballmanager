import { describe, expect, it } from "vitest";
import { ACHIEVEMENT, grantAchievement } from "../player/achievements.ts";
import { defaultYouthContract } from "../player/youth-contract.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  achievementBadges,
  contractView,
  flavorForScout,
  generatePlayerFlavor,
  generatePlayerTraits,
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

  it("adds negative traits from player state", () => {
    const moody = clonePlayer();
    moody.state.morale = 30;
    const traits = generatePlayerTraits(moody);
    expect(traits.some((trait) => trait.tone === "negative" && trait.label.includes("Launisch"))).toBe(true);
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

  it("hides negative traits from lightly scouted foreign players", () => {
    const foreign = clonePlayer();
    foreign.state.morale = 20;
    const partial = flavorForScout(foreign, false, { estimatedAbilityMean: 65, uncertaintyRange: 16, sampleSize: 2 });
    expect(partial?.traits.every((trait) => trait.tone !== "negative")).toBe(true);
  });

  it("returns only stored achievements", () => {
    expect(achievementBadges(player, true)).toEqual([]);
    const decorated = grantAchievement(player, ACHIEVEMENT.promotedU19);
    expect(achievementBadges(decorated, true)).toEqual([ACHIEVEMENT.promotedU19]);
  });

  it("builds season stats and contract views", () => {
    const withMinutes = clonePlayer();
    withMinutes.state.season_minutes = 360;
    expect(seasonStatsStub(withMinutes, true)?.apps).toBeGreaterThan(0);
    expect(seasonStatsStub(player, true)?.minutes).toBe(0);
    expect(seasonStatsStub(player, false, { estimatedAbilityMean: 65, uncertaintyRange: 30, sampleSize: 0 })).toBeNull();
    expect(contractView(player, true).status).toBe("Profivertrag");
    const youth = clonePlayer();
    youth.squad_status = "u17";
    youth.contract = null;
    expect(contractView(youth, true).status).toBe("Kein Vertrag");
    expect(contractView(youth, true).wageWeekly).toBe("Noch nicht unterzeichnet");
    youth.contract = defaultYouthContract(15, 1);
    expect(contractView(youth, true).wageWeekly).toContain("€");
  });
});
