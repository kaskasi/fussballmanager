import { describe, expect, it } from "vitest";
import { NORDSTERN_ID, asTeamId } from "@fussballmanager/shared";
import { matchdayClubEventMessages } from "./post-match-events.ts";

describe("post-match events", () => {
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
});
