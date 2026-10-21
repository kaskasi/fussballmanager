import { beforeEach, describe, expect, it } from "vitest";
import { normalizeClubMerchandising } from "../economy/merchandising.ts";
import { setLocale } from "../i18n/index.ts";
import { newGameSession } from "../persistence/game-session.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { merchStockAlertClubEventMessages } from "./merch-notifications.ts";

function withStock(stadium: ClubStadium, stock: Record<string, number>): ClubStadium {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const skus = { ...merch.skus };
  for (const [sku, units] of Object.entries(stock)) {
    const row = skus[sku as keyof typeof skus];
    if (row) skus[sku as keyof typeof skus] = { ...row, stock: units };
  }
  return { ...stadium, merchandising: { ...merch, skus } };
}

describe("merch stock alerts", () => {
  beforeEach(() => setLocale("en"));

  it("mails once when an SKU sells out or drops below the low-stock line", () => {
    const base = newGameSession().stadium;
    const before = withStock(base, { trikots: 30, caps: 40 });
    const after = withStock(base, { trikots: 0, caps: 9 });
    const messages = merchStockAlertClubEventMessages(before, after);
    expect(messages).toContain("Fan shop: Jerseys sold out — restock in Merchandising.");
    expect(messages.some((line) => line.includes("only 9× Caps left"))).toBe(true);
  });

  it("stays quiet when stock was already low or empty last week", () => {
    const base = newGameSession().stadium;
    const before = withStock(base, { trikots: 0, caps: 5 });
    const after = withStock(base, { trikots: 0, caps: 3 });
    expect(merchStockAlertClubEventMessages(before, after)).toEqual([]);
  });
});
