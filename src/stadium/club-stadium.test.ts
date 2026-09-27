import { describe, expect, it } from "vitest";
import { matchdayTicketIncome } from "../economy/club-finances.ts";
import {
  adjustBlockTicketPrice,
  defaultClubStadium,
  stadiumMatchdayIncome,
  stadiumTotalCapacity,
} from "./club-stadium.ts";

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

  it("raises matchday income when ticket prices increase", () => {
    const stadium = defaultClubStadium();
    const before = stadiumMatchdayIncome(stadium);
    const pricier = adjustBlockTicketPrice(stadium, "north", 10);
    expect(stadiumMatchdayIncome(pricier)).toBeGreaterThan(before);
  });
});
