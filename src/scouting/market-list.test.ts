import { describe, expect, it } from "vitest";
import { formatPlayerName } from "../types/player-display.ts";
import {
  confidenceBucket,
  filterMarket,
  headlineCounts,
  loadMarketList,
} from "./market-list.ts";

describe("market list", () => {
  const market = loadMarketList();

  it("loads 48 external players", () => {
    expect(market).toHaveLength(48);
    expect(market.every((target) => target.player.club_id === "cl_rival_pool")).toBe(true);
  });

  it("counts headline buckets from uncertainty range", () => {
    const counts = headlineCounts(market);
    expect(counts.known + counts.unclear + counts.unknown).toBe(48);
    expect(confidenceBucket(40)).toBe("unknown");
    expect(confidenceBucket(25)).toBe("unclear");
    expect(confidenceBucket(8)).toBe("known");
    expect(counts.unknown).toBeGreaterThan(0);
    expect(counts.unclear).toBeGreaterThan(0);
    expect(counts.known).toBeGreaterThan(0);
  });

  it("filters by position and confidence", () => {
    const gk = filterMarket(market, { query: "", position: "GK", confidence: "all" });
    const unknown = filterMarket(market, { query: "", position: "all", confidence: "unknown" });
    expect(gk.every((target) => target.player.position === "GK")).toBe(true);
    expect(unknown.every((target) => target.estimate.uncertaintyRange >= 40)).toBe(true);
    const sampleName = formatPlayerName(market[0]!.player).split(" ")[0]!.toLowerCase();
    expect(filterMarket(market, { query: sampleName, position: "all", confidence: "all" }).length).toBeGreaterThan(0);
  });
});
