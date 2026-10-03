import { describe, expect, it } from "vitest";
import { formatPlayerName } from "../types/player-display.ts";
import {
  generateWorld,
  NORDSTERN_CLUB_ID,
} from "../world/world-generator.ts";
import {
  confidenceBucket,
  filterMarket,
  headlineCounts,
  loadMarketList,
  barBand,
  barTrackPercents,
  marketFiltersActive,
  DEFAULT_MARKET_FILTERS,
} from "./market-list.ts";

describe("market list", () => {
  const world = generateWorld(2026);
  const rivals = world.players.filter((player) => player.club_id !== NORDSTERN_CLUB_ID);
  const market = loadMarketList(rivals, world.clubs);

  it("loads senior players from rival league clubs", () => {
    expect(market.length).toBeGreaterThan(40);
    expect(market.every((target) => target.player.squad_status === "pro")).toBe(true);
    expect(market.every((target) => target.player.age >= 18)).toBe(true);
    expect(market.every((target) => target.player.club_id !== "cl_fc_nordstern")).toBe(true);
    const clubs = new Set(market.map((target) => target.player.club_id));
    expect(clubs.size).toBeGreaterThan(1);
  });

  it("counts headline buckets from uncertainty range", () => {
    const counts = headlineCounts(market);
    expect(counts.known + counts.unclear + counts.unknown).toBe(market.length);
    expect(confidenceBucket(40)).toBe("unknown");
    expect(confidenceBucket(25)).toBe("unclear");
    expect(confidenceBucket(8)).toBe("known");
    expect(counts.unknown).toBeGreaterThan(0);
    expect(counts.unclear).toBeGreaterThan(0);
    expect(counts.known).toBeGreaterThan(0);
  });

  it("filters by position, age, and confidence", () => {
    const gk = filterMarket(market, { query: "", position: "GK", confidence: "all", age: "all" });
    const youth = filterMarket(market, { query: "", position: "all", confidence: "all", age: "u21" });
    const unknown = filterMarket(market, { query: "", position: "all", confidence: "unknown", age: "all" });
    expect(gk.every((target) => target.player.position === "GK")).toBe(true);
    expect(youth.length).toBeGreaterThan(0);
    expect(youth.every((target) => target.player.age <= 21)).toBe(true);
    expect(unknown.every((target) => target.estimate.uncertaintyRange >= 40)).toBe(true);
    const sampleName = formatPlayerName(market[0]!.player).split(" ")[0]!.toLowerCase();
    expect(filterMarket(market, { query: sampleName, position: "all", confidence: "all", age: "all" }).length).toBeGreaterThan(0);
    const clubName = market.find((target) => target.clubName)?.clubName ?? "";
    expect(filterMarket(market, { query: clubName, position: "all", confidence: "all", age: "all" }).length).toBeGreaterThan(0);
  });

  it("places CI as a grey zone on the 0–199 bar", () => {
    const band = barBand({ estimatedAbilityMean: 80, uncertaintyRange: 20, sampleSize: 1 });
    expect(band.low).toBe(70);
    expect(band.high).toBe(90);
    const track = barTrackPercents(band.low, band.high, band.value, 199);
    expect(track.fill).toBeCloseTo((80 / 199) * 100, 5);
    expect(track.ciWidth).toBeGreaterThan(track.fill * 0.1);
  });

  it("flags any non-default market filter as active", () => {
    expect(marketFiltersActive(DEFAULT_MARKET_FILTERS)).toBe(false);
    expect(marketFiltersActive({ ...DEFAULT_MARKET_FILTERS, confidence: "unknown" })).toBe(true);
    expect(marketFiltersActive({ ...DEFAULT_MARKET_FILTERS, query: "Nord" })).toBe(true);
  });
});
