import { describe, expect, it } from "vitest";
import { matchdayTicketIncome } from "../economy/club-finances.ts";
import {
  adjustBlockTicketPrice,
  defaultClubStadium,
  fillRateForTicketPrice,
  fillRateStrength,
  FILL_RATE_MIN,
  FILL_RATE_MAX,
  normalizeClubStadium,
  stadiumMatchdayIncome,
  stadiumTotalCapacity,
} from "./club-stadium.ts";
import { emptyPrecinct, normalizePrecinct, placePrecinctBuilding } from "./precinct.ts";
import { startBlockExpansion } from "./stadium-block-expansion.ts";

describe("club stadium", () => {
  it("defaults to roughly 8k seats", () => {
    const stadium = defaultClubStadium();
    expect(stadiumTotalCapacity(stadium)).toBe(8_000);
  });

  it("matches legacy division ticket yield at default prices", () => {
    const stadium = defaultClubStadium();
    const fromBlocks = stadiumMatchdayIncome(stadium);
    const fromDivision = matchdayTicketIncome("regionalliga-nord", true);
    expect(fromBlocks).toBeGreaterThan(95_000);
    expect(fromBlocks).toBeLessThan(115_000);
    expect(Math.abs(fromBlocks - fromDivision)).toBeLessThan(15_000);
  });

  it("keeps custom ticket prices after normalize", () => {
    let stadium = defaultClubStadium();
    stadium = adjustBlockTicketPrice(stadium, "north", 8);
    const northPrice = stadium.blocks.find((block) => block.id === "north")!.ticket_price_eur;
    expect(northPrice).toBeGreaterThan(12);
    const again = normalizeClubStadium(stadium);
    expect(again.blocks.find((block) => block.id === "north")!.ticket_price_eur).toBe(northPrice);
  });

  it("lowers fill rate when ticket prices rise", () => {
    const stadium = defaultClubStadium();
    const north = stadium.blocks.find((block) => block.id === "north")!;
    const pricier = adjustBlockTicketPrice(stadium, "north", 8);
    const updated = pricier.blocks.find((block) => block.id === "north")!;
    expect(updated.fill_rate).toBeLessThan(north.fill_rate);
    expect(updated.fill_rate).toBe(
      fillRateForTicketPrice("north", updated.ticket_price_eur, stadium.fanbase),
    );
  });

  it("maps fill rate to a 0–1 tint strength", () => {
    expect(fillRateStrength(FILL_RATE_MAX)).toBe(1);
    expect(fillRateStrength(FILL_RATE_MIN)).toBe(0);
    expect(fillRateStrength(0.6)).toBeGreaterThan(fillRateStrength(FILL_RATE_MIN));
  });

  it("raises fill rate when ticket prices fall", () => {
    const stadium = defaultClubStadium();
    const west = stadium.blocks.find((block) => block.id === "west")!;
    const cheaper = adjustBlockTicketPrice(stadium, "west", -6);
    const updated = cheaper.blocks.find((block) => block.id === "west")!;
    expect(updated.fill_rate).toBeGreaterThan(west.fill_rate);
  });

  it("excludes tribunes under construction from matchday capacity", () => {
    let stadium = defaultClubStadium();
    expect(stadiumTotalCapacity(stadium, 1, 1)).toBe(8_000);
    stadium = startBlockExpansion(stadium, "north", 1, 1);
    expect(stadiumTotalCapacity(stadium, 1, 1)).toBe(8_000 - 2_400);
    expect(stadiumMatchdayIncome(stadium, 1, 1)).toBeLessThan(
      stadiumMatchdayIncome(defaultClubStadium(), 1, 1),
    );
  });

  it("raises fill when a rail stop is on the campus", () => {
    const stadium = defaultClubStadium();
    const north = stadium.blocks.find((block) => block.id === "north")!;
    const withRail = normalizeClubStadium({
      ...stadium,
      // Beside the starter road (x = 8), so the 2×3 stop fits and docks.
      precinct: normalizePrecinct(placePrecinctBuilding(emptyPrecinct(), 9, 0, "transit")),
    });
    const updated = withRail.blocks.find((block) => block.id === "north")!;
    expect(updated.fill_rate).toBeGreaterThan(north.fill_rate);
  });
});
