import { asTeamId, type FormationId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { buildPreMatchBrief } from "./pre-match-brief.ts";

const nordstern = asTeamId("fc-nordstern");
const rheinwacht = asTeamId("sv-rheinwacht");

const baseSetup: CareerMatchSetup = {
  seed: 4242,
  matchday: 7,
  calendarWeek: 28,
  fixture: {
    id: "md7-nordstern-rheinwacht",
    matchday: 7,
    homeTeamId: nordstern,
    awayTeamId: rheinwacht,
  },
  homeTeamId: nordstern,
  awayTeamId: rheinwacht,
  playerClubId: nordstern,
  opponentShortName: "SV Rheinwacht",
  isHome: true,
};

describe("buildPreMatchBrief", () => {
  it("is stable for the same seed and formation", () => {
    const a = buildPreMatchBrief(baseSetup, "4-3-3", []);
    const b = buildPreMatchBrief(baseSetup, "4-3-3", []);
    expect(a.colorLine).toBe(b.colorLine);
    expect(a.playerFormation).toBe("4-3-3");
    expect(a.opponentShortName).toBe("SV Rheinwacht");
  });

  it("changes color line when formation changes", () => {
    const home433 = buildPreMatchBrief(baseSetup, "4-3-3", []);
    const home442 = buildPreMatchBrief(baseSetup, "4-4-2", []);
    expect(home433.colorLine).not.toBe(home442.colorLine);
  });

  it("reflects away venue in templates pool", () => {
    const away: CareerMatchSetup = {
      ...baseSetup,
      isHome: false,
      playerClubId: rheinwacht,
      opponentShortName: "FC Nordstern",
    };
    const brief = buildPreMatchBrief(away, "3-5-2" as FormationId, []);
    expect(brief.isHome).toBe(false);
    expect(brief.colorLine.length).toBeGreaterThan(20);
  });
});
