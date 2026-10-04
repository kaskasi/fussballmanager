import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  activeStampBadges,
  awardStamp,
  canEarnStamp,
  careerApps,
  eligibleTrainStamps,
  evaluateEventStamps,
  hasStamp,
} from "./ability-stamps.ts";

describe("ability stamps (F2.8)", () => {
  it("blocks train stamps until attribute gates are met", () => {
    const player = clonePlayer();
    player.attributes.strength = 80;
    player.attributes.positioning = 80;
    expect(canEarnStamp(player, "kopfballungeheuer").ok).toBe(false);
    expect(eligibleTrainStamps(player)).toHaveLength(0);

    player.attributes.strength = 105;
    player.attributes.positioning = 95;
    expect(canEarnStamp(player, "kopfballungeheuer").ok).toBe(true);
    expect(eligibleTrainStamps(player).map((entry) => entry.id)).toContain("kopfballungeheuer");
  });

  it("bakes permanent attribute bumps and records the stamp once", () => {
    const player = clonePlayer();
    player.attributes.strength = 105;
    player.attributes.positioning = 95;
    const awarded = awardStamp(player, "kopfballungeheuer", 1, 12);

    expect(awarded.attributes.strength).toBe(108);
    expect(awarded.attributes.positioning).toBe(97);
    expect(hasStamp(awarded, "kopfballungeheuer")).toBe(true);
    expect(awardStamp(awarded, "kopfballungeheuer", 1, 13).stamps).toHaveLength(1);
  });

  it("awards event stamps when season counters clear the gate", () => {
    const player = clonePlayer();
    player.state.season_goals = 25;
    const result = evaluateEventStamps([player], 2, 40);
    expect(hasStamp(result.players[0]!, "torjaeger_saison")).toBe(true);
    expect(result.awards[0]?.label).toBe("Torjäger");
    expect(result.players[0]!.attributes.shooting).toBe(player.attributes.shooting + 3);
  });

  it("counts career apps from growth history plus this season", () => {
    const player = clonePlayer();
    player.history.growth = [
      {
        season: 1,
        age: 18,
        attributes_snapshot: player.attributes,
        minutes_played: 2000,
        drive_at_snapshot: 1,
        season_apps: 280,
      },
    ];
    player.state.season_apps = 25;
    expect(careerApps(player)).toBe(305);
    const result = evaluateEventStamps([player], 2, 10);
    expect(hasStamp(result.players[0]!, "alter_recke")).toBe(true);
  });

  it("surfaces the three newest stamps as active badges", () => {
    let player = clonePlayer();
    player.attributes.strength = 120;
    player.attributes.positioning = 120;
    player.attributes.pace = 120;
    player.attributes.stamina = 120;
    player.attributes.vision = 120;
    player.attributes.passing = 120;
    player = awardStamp(player, "kopfballungeheuer", 1, 1);
    player = awardStamp(player, "geolter_blitz", 1, 2);
    player = awardStamp(player, "spielmacher_blick", 1, 3);
    player.state.season_yellow_cards = 13;
    player = evaluateEventStamps([player], 1, 4).players[0]!;
    const badges = activeStampBadges(player, 3);
    expect(badges).toHaveLength(3);
    expect(badges[0]?.id).toBe("treter");
  });
});
