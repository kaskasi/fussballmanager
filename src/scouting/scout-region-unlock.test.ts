import { describe, expect, it } from "vitest";
import { emptyDiscovery, regionScoutTier } from "./scout-discovery.ts";
import {
  applyHomeZoneBootstrap,
  homeZoneIdForClub,
  isRegionMapUnlocked,
} from "./scout-region-unlock.ts";
import type { WorldClub } from "../world/world-generator.ts";

const foerdeClub: WorldClub = {
  id: "home",
  name: "Home FC",
  short_name: "HFC",
  place: "Kiel",
  region: "Fördeküste",
  division_id: "regionalliga-nord",
  identity: "community",
  reputation: 50,
  rivalry_ids: [],
  kit: { primary: "#2e9e46", secondary: "#1e7a38" },
};

describe("scout region unlock", () => {
  it("maps player club region to home zone id", () => {
    expect(homeZoneIdForClub(foerdeClub)).toBe("foerde");
  });

  it("bootstraps home zone to tier 3 on new careers", () => {
    const discovery = applyHomeZoneBootstrap(emptyDiscovery(), foerdeClub);
    expect(regionScoutTier(discovery, "foerde")).toBe(3);
    expect(isRegionMapUnlocked(discovery, "foerde", "foerde")).toBe(true);
  });

  it("foreign zone locked at tier 0, unlocked at tier 3", () => {
    const discovery = applyHomeZoneBootstrap(emptyDiscovery(), foerdeClub);
    expect(isRegionMapUnlocked(discovery, "hanse", "foerde")).toBe(false);
    const tier3 = {
      ...discovery,
      region_scout_tier: { ...discovery.region_scout_tier, hanse: 3 },
    };
    expect(isRegionMapUnlocked(tier3, "hanse", "foerde")).toBe(true);
  });
});
