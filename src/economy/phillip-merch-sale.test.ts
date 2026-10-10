import { describe, expect, it } from "vitest";
import { calendarWeek } from "../sim/game-calendar.ts";
import { isPhillipMerchSaleWeek } from "./phillip-merch-sale.ts";

describe("isPhillipMerchSaleWeek", () => {
  it("covers Spieltag 2 and 3", () => {
    expect(isPhillipMerchSaleWeek(2)).toBe(true);
    expect(isPhillipMerchSaleWeek(3)).toBe(true);
    expect(isPhillipMerchSaleWeek(1)).toBe(false);
    expect(isPhillipMerchSaleWeek(4)).toBe(false);
  });

  it("covers January via calendar KW 2 and 3 (not Spieltag 2–3)", () => {
    const janWeeks = Array.from({ length: 30 }, (_, i) => i + 10).filter(
      (w) => w > 3 && (calendarWeek(w) === 2 || calendarWeek(w) === 3),
    );
    expect(janWeeks.length).toBeGreaterThan(0);
    for (const w of janWeeks) {
      expect(isPhillipMerchSaleWeek(w)).toBe(true);
    }
    expect(isPhillipMerchSaleWeek(10)).toBe(false);
  });
});
