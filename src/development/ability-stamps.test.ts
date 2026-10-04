import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  activeStampBadges,
  awardStamp,
  canEarnStamp,
  careerApps,
  eligibleTrainStamps,
  evaluateClearStamps,
  evaluateEventStamps,
  formatStampEffects,
  formatStampGates,
  hasStamp,
  recordAppearanceGoals,
  seedPhaseStamps,
  stampDefinition,
  stampGateMarkers,
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
    expect(awarded.attributes.pace).toBe(player.attributes.pace - 1);
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

  it("formats gates and effects for the help catalog", () => {
    const train = stampDefinition("kopfballungeheuer")!;
    expect(formatStampGates(train)).toEqual(["Kraft ≥ 100", "Stellung ≥ 90"]);
    expect(formatStampEffects(train)).toEqual(["Kraft +3", "Stellung +2", "Tempo -1"]);
    const event = stampDefinition("torjaeger_saison")!;
    expect(formatStampGates(event)).toEqual(["25+ Tore in einer Saison"]);
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

  it("seeds Grünschnabel for almost every new player and clears at 40 apps", () => {
    const raw = clonePlayer();
    raw.state.season_apps = 0;
    const seeded = seedPhaseStamps(raw, 1, 1, () => 0);
    expect(hasStamp(seeded, "gruenschnabel")).toBe(true);
    expect(seeded.attributes.composure).toBe(raw.attributes.composure - 2);
    seeded.state.season_apps = 40;
    const cleared = evaluateClearStamps([seeded]);
    expect(hasStamp(cleared.players[0]!, "gruenschnabel")).toBe(false);
    expect(cleared.players[0]!.attributes.composure).toBe(raw.attributes.composure);
  });

  it("clears Chancentod after a hat-trick or a five-game scoring streak", () => {
    const raw = clonePlayer();
    raw.position = "CF";
    const cursed = seedPhaseStamps(raw, 1, 1, () => 0);
    expect(hasStamp(cursed, "chancentod")).toBe(true);
    const hat = evaluateClearStamps([recordAppearanceGoals(cursed, 3)]);
    expect(hasStamp(hat.players[0]!, "chancentod")).toBe(false);

    let streak = seedPhaseStamps(raw, 1, 1, () => 0);
    for (let game = 0; game < 5; game += 1) {
      streak = recordAppearanceGoals(streak, 1);
    }
    const afterStreak = evaluateClearStamps([streak]);
    expect(hasStamp(afterStreak.players[0]!, "chancentod")).toBe(false);
  });

  it("unlocks hybrid stamps without auto-awarding them", () => {
    const player = clonePlayer();
    player.attributes.leadership = 95;
    player.state.season_apps = 80;
    expect(canEarnStamp(player, "anfuehrer").ok).toBe(true);
    expect(eligibleTrainStamps(player).map((entry) => entry.id)).toContain("anfuehrer");
    const events = evaluateEventStamps([player], 1, 8);
    expect(hasStamp(events.players[0]!, "anfuehrer")).toBe(false);
    const sealed = awardStamp(player, "anfuehrer", 1, 8);
    expect(hasStamp(sealed, "anfuehrer")).toBe(true);
    expect(sealed.stamps[0]?.path).toBe("hybrid");
    expect(sealed.attributes.leadership).toBe(player.attributes.leadership + 3);
    expect(sealed.attributes.pace).toBe(player.attributes.pace - 1);
  });

  it("gates archetype stamps on position, concentration, and flexibility lanes", () => {
    const outfield = clonePlayer();
    outfield.attributes.gk_handling = 120;
    outfield.attributes.positioning = 95;
    expect(eligibleTrainStamps(outfield).map((entry) => entry.id)).not.toContain("sweeper_keeper");

    const keeper = clonePlayer();
    keeper.position = "GK";
    keeper.attributes.gk_handling = 120;
    keeper.attributes.positioning = 95;
    expect(eligibleTrainStamps(keeper).map((entry) => entry.id)).toContain("sweeper_keeper");

    const warrior = clonePlayer();
    warrior.attributes.strength = 105;
    warrior.attributes.concentration = 90;
    expect(eligibleTrainStamps(warrior).map((entry) => entry.id)).toContain("krieger");

    const utility = clonePlayer();
    utility.flexibility = [
      { trained_as: "AM", proficiency: 0.5, weeks_trained: 4 },
      { trained_as: "CB", proficiency: 0.5, weeks_trained: 4 },
    ];
    expect(eligibleTrainStamps(utility).map((entry) => entry.id)).toContain("taschenmesser");
  });

  it("marks stamp-gate keys so Kopfballungeheuer shows Stärke and Stellung", () => {
    const player = clonePlayer();
    const marks = stampGateMarkers(player);
    expect(marks.strength).toContain("Kopfballungeheuer");
    expect(marks.positioning).toContain("Kopfballungeheuer");
  });
});
