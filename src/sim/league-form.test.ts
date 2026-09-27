import { describe, expect, it } from "vitest";
import { asTeamId } from "@fussballmanager/shared";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { formSparkline, resultOutcome, teamForm } from "./league-form.ts";

describe("league form", () => {
  it("derives last-five outcomes and sparkline glyphs", () => {
    const home = asTeamId("nordstern");
    const away = asTeamId("tsv-holzweg");
    const league = {
      ...defaultLeagueState(),
      results: [
        { homeTeamId: home, awayTeamId: away, homeGoals: 2, awayGoals: 1 },
        { homeTeamId: away, awayTeamId: home, homeGoals: 1, awayGoals: 1 },
        { homeTeamId: home, awayTeamId: away, homeGoals: 0, awayGoals: 2 },
      ],
    };
    expect(resultOutcome(league.results[0]!, home)).toBe("W");
    expect(resultOutcome(league.results[1]!, home)).toBe("D");
    expect(resultOutcome(league.results[2]!, home)).toBe("L");
    expect(teamForm(league, home)).toEqual(["W", "D", "L"]);
    expect(formSparkline(["W", "D", "L"])).toBe("▲■▼");
  });
});
