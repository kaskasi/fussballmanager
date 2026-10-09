import { describe, expect, it } from "vitest";
import { formatLeagueMatchKickoffLabel } from "./match-kickoff-format.ts";

describe("formatLeagueMatchKickoffLabel", () => {
  it("formats Spieltag 1 Saturday with 15:30 kickoff", () => {
    const label = formatLeagueMatchKickoffLabel(1, 1, 6);
    expect(label).toMatch(/15:30/);
    expect(label).toMatch(/2026/);
  });
});
