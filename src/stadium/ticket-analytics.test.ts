import { describe, expect, it } from "vitest";
import { seasonHomeTicketMatches, blockShareOfMatchday } from "./ticket-analytics.ts";
import { defaultClubStadium } from "./club-stadium.ts";
import type { ClubFinances } from "../economy/club-finances.ts";

describe("ticket analytics", () => {
  it("collects matchday ticket lines by week", () => {
    const finances: ClubFinances = {
      cash: 1,
      transfer_budget: 0,
      wage_budget_weekly: 1,
      pending_lines: [
        { kind: "matchday_tickets", amount: 120_000, week: 3 },
        { kind: "matchday_tickets", amount: 95_000, week: 7 },
      ],
    };
    expect(seasonHomeTicketMatches(finances, 1)).toEqual([
      { week: 3, total: 120_000 },
      { week: 7, total: 95_000 },
    ]);
  });

  it("splits block share from current stadium model", () => {
    const stadium = defaultClubStadium();
    const north = stadium.blocks.find((block) => block.id === "north")!;
    const share = blockShareOfMatchday(stadium, north);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
  });
});
