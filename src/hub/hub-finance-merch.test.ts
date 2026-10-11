import { describe, expect, it } from "vitest";
import { buildHubMerchDeskView } from "./hub-finance-merch.ts";
import { defaultClubMerchandising } from "../economy/merchandising.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";

function stadiumWithMerch(): ClubStadium {
  const merch = defaultClubMerchandising();
  merch.last_week_sale = {
    units: { trikots: 10, caps: 3 },
    gross: { trikots: 720, caps: 66 },
    cogs: { trikots: 280, caps: 21 },
  };
  merch.skus.trikots = { ...merch.skus.trikots!, stock: 42 };
  merch.skus.caps = { ...merch.skus.caps!, stock: 0 };
  return {
    name: "Test",
    blocks: [],
    merchandising: merch,
  };
}

describe("buildHubMerchDeskView", () => {
  it("sums last-week units and marks trikots hero", () => {
    const view = buildHubMerchDeskView(stadiumWithMerch());
    expect(view).not.toBeNull();
    expect(view!.totalUnitsSoldLastWeek).toBe(13);
    expect(view!.cells.find((c) => c.sku === "trikots")?.variant).toBe("hero");
    expect(view!.cells.find((c) => c.sku === "caps")?.stock).toBe(0);
  });
});
