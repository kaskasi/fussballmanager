import { describe, expect, it } from "vitest";
import { NORDSTERN_ID, RHEINWACHT_ID, SEED_MATCHUP } from "./seed-clubs.ts";
import { kickoffLineup, squadIssues } from "./squad.ts";

describe("seed squads", () => {
  it("gives each club 11 starters, a bench, and a fixed formation", () => {
    expect(squadIssues(SEED_MATCHUP.home)).toEqual([]);
    expect(squadIssues(SEED_MATCHUP.away)).toEqual([]);
    expect(SEED_MATCHUP.home.tactics.keeperDuty).toBe("sweeper");
    expect(SEED_MATCHUP.home.tactics.fullbackDuty).toEqual({
      LB: "inside",
      RB: "inside",
    });
    expect(SEED_MATCHUP.away.tactics.keeperDuty).toBe("stay");
    expect(SEED_MATCHUP.home.tactics.dmDuty).toBe("hold");
    expect(SEED_MATCHUP.home.tactics.cmDuty).toEqual({
      LCM: "playmaker",
      RCM: "mezzala",
    });
    expect(SEED_MATCHUP.home.tactics.wideDuty).toEqual({
      left: "invert",
      right: "invert",
    });
    expect(SEED_MATCHUP.home.tactics.strikerDuty.ST).toBe("false_nine");
    expect(SEED_MATCHUP.away.tactics.cmDuty.LCM).toBe("box_to_box");
    expect(SEED_MATCHUP.away.tactics.wideDuty.left).toBe("wide");
    expect(SEED_MATCHUP.away.tactics.strikerDuty).toEqual({
      ST: "poacher",
      LST: "target",
      RST: "poacher",
    });
    expect(SEED_MATCHUP.home.bench).toHaveLength(7);
    expect(SEED_MATCHUP.away.bench).toHaveLength(7);
  });

  it("places both XIs on the pitch at kickoff, attacking opposite goals", () => {
    const home = kickoffLineup(SEED_MATCHUP.home, "home");
    const away = kickoffLineup(SEED_MATCHUP.away, "away");
    const homeGk = home.find((place) => place.slot === "GK");
    const awayGk = away.find((place) => place.slot === "GK");
    expect(homeGk?.position.x).toBeLessThan(20);
    expect(awayGk?.position.x).toBeGreaterThan(80);
    expect(home).toHaveLength(11);
    expect(away).toHaveLength(11);
  });

  it("keeps sample event player ids on the seed squads", () => {
    const nordIds = [
      ...SEED_MATCHUP.home.starters.map((place) => place.player.id),
      ...SEED_MATCHUP.home.bench.map((player) => player.id),
    ];
    const rheinIds = [
      ...SEED_MATCHUP.away.starters.map((place) => place.player.id),
      ...SEED_MATCHUP.away.bench.map((player) => player.id),
    ];
    expect(nordIds).toContain("nord-8");
    expect(nordIds).toContain("nord-9");
    expect(rheinIds).toContain("rhein-1");
    expect(rheinIds).toContain("rhein-5");
    expect(SEED_MATCHUP.home.starters.find((place) => place.slot === "ST")?.player.shirt).toBe(
      9,
    );
    expect(SEED_MATCHUP.home.team.id).toBe(NORDSTERN_ID);
    expect(SEED_MATCHUP.away.team.id).toBe(RHEINWACHT_ID);
    const homeCb = SEED_MATCHUP.home.starters.find((place) => place.slot === "LCB");
    const homeRcb = SEED_MATCHUP.home.starters.find((place) => place.slot === "RCB");
    const homeW = SEED_MATCHUP.home.starters.find((place) => place.slot === "LW");
    expect(homeCb?.player.attributes.heightCm).toBeGreaterThan(
      homeW?.player.attributes.heightCm ?? 0,
    );
    expect(homeCb?.player.attributes.pace).not.toBe(homeRcb?.player.attributes.pace);
  });
});
