import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n/index.ts";
import { formatFixtureResult } from "../sim/league-week.ts";
import { NORDSTERN_ID, asTeamId } from "@fussballmanager/shared";
import { matchdayClubEventMessages } from "./post-match-events.ts";

describe("post-match events", () => {
  beforeEach(() => setLocale("en"));

  it("builds score and scorer messages for the player club", () => {
    const messages = matchdayClubEventMessages(
      {
        homeTeamId: NORDSTERN_ID,
        awayTeamId: asTeamId("tsv-holzweg"),
        homeGoals: 2,
        awayGoals: 1,
      },
      NORDSTERN_ID,
      [
        {
          playerId: "pl_1",
          name: "Max Müller",
          goals: 1,
          assists: 1,
          yellowCards: 1,
          minutes: 90,
          apps: 1,
        },
      ],
    );
    expect(messages[0]).toContain("2:1");
    expect(messages.some((message) => message.includes("Max Müller"))).toBe(true);
    expect(messages.some((message) => message.includes("🟨"))).toBe(true);
  });

  it("puts the player club's goals first in away games", () => {
    const line = formatFixtureResult(
      { homeTeamId: asTeamId("tsv-holzweg"), awayTeamId: NORDSTERN_ID, homeGoals: 5, awayGoals: 0 },
      NORDSTERN_ID,
    );
    expect(line.startsWith("L 0:5 at ")).toBe(true);
    expect(line).toContain("(away)");
  });

  it("names the opponent in full, never by short code", () => {
    const line = formatFixtureResult(
      { homeTeamId: NORDSTERN_ID, awayTeamId: asTeamId("tsv-holzweg"), homeGoals: 1, awayGoals: 1 },
      NORDSTERN_ID,
    );
    expect(line).toMatch(/^D 1:1 vs .+ \(home\)$/);
    expect(line).toContain("Holzweg");
  });
});
