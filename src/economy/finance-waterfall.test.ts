import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceWeeklyClubFinances,
  defaultClubFinances,
} from "./club-finances.ts";
import {
  resolveFinanceWaterfall,
  seasonCashSparkline13,
  seasonCategorizedFlows,
  weekPreviewFinanceLines,
} from "./finance-waterfall.ts";
import { spendClubCash } from "./club-finances.ts";

function weekContext(week = 1) {
  const player = clonePlayer();
  player.club_id = "cl_fc_nordstern";
  player.contract = { ...player.contract!, wage_weekly: 5_000 };
  return {
    players: [player],
    clubId: "cl_fc_nordstern",
    divisionId: "regionalliga-nord" as const,
    isHomeMatchWeek: false,
    season: 1,
    week,
  };
}

describe("finance waterfall", () => {
  it("shows this week's streams before any booking (week 1 furniture)", () => {
    const preview = weekPreviewFinanceLines(weekContext());
    const view = resolveFinanceWaterfall(defaultClubFinances(), 1, 1, preview);
    expect(view.source).toBe("week_preview");
    expect(view.title).toBe("Diese Woche");
    const kinds = view.streams.map((line) => line.kind);
    expect(kinds[0]).toBe("sponsorship");
    expect(view.streams.findIndex((line) => line.amount < 0)).toBeGreaterThan(
      view.streams.findIndex((line) => line.amount > 0),
    );
    expect(kinds).toEqual(expect.arrayContaining(["sponsorship", "player_wages", "facility_maintenance"]));
  });

  it("uses pending lines after a weekly close", () => {
    const { finances } = advanceWeeklyClubFinances(defaultClubFinances(), weekContext());
    const view = resolveFinanceWaterfall(finances, 1, 1, []);
    expect(view.source).toBe("pending");
    expect(view.title).toBe("Monat 1");
    expect(view.streams.length).toBeGreaterThan(0);
  });

  it("keeps last closed month after month-end instead of an empty tile", () => {
    let finances = defaultClubFinances();
    for (let week = 1; week <= 4; week += 1) {
      finances = advanceWeeklyClubFinances(finances, weekContext(week)).finances;
    }
    expect(finances.last_closed_month).toBe(1);
    expect(finances.pending_lines).toEqual([]);
    const view = resolveFinanceWaterfall(finances, 1, 5, []);
    expect(view.source).toBe("last_closed");
    expect(view.title).toBe("Monat 1");
    expect(view.streams.length).toBeGreaterThan(0);
  });

  it("pads the season sparkline to 13 months even in week 1", () => {
    const points = seasonCashSparkline13(defaultClubFinances(), 1, 1);
    expect(points).toHaveLength(13);
    expect(new Set(points).size).toBe(1);
  });

  it("groups infrastructure into the Ausbau category", () => {
    const spent = spendClubCash(defaultClubFinances(), 320_000, 1);
    const rows = seasonCategorizedFlows(spent, 1, 1);
    expect(rows[0]?.infrastructure).toBe(-320_000);
  });
});
