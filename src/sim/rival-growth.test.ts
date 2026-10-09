import { asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { squadAverageStrength } from "@fussballmanager/shared";
import { defaultLeaguePools, squadForLeagueClub } from "./league-divisions.ts";
import {
  advanceRivalGrowthWeek,
  careerTeamId,
  initializeRivalPlayers,
  rivalCareerId,
} from "./rival-growth.ts";
import { buildRivalEngineSquad } from "./rival-engine-squad.ts";

describe("rival growth", () => {
  it("initializes hidden growth state for every rival club", () => {
    const rivals = initializeRivalPlayers(2026);
    expect(rivals.length).toBeGreaterThan(100);
    expect(rivals.every((player) => player.hidden.drive > 0)).toBe(true);
  });

  it("grows rival squads over multiple league weeks", () => {
    const rivals = initializeRivalPlayers(2026);
    const teamId = defaultLeaguePools()["regionalliga-nord"][1]!;
    const clubId = careerTeamId(teamId);
    const template = squadForLeagueClub(teamId)!;
    const before = squadAverageStrength(
      buildRivalEngineSquad(template, rivals.filter((player) => player.club_id === clubId)),
    );

    let current = rivals;
    for (let week = 1; week <= 8; week++) {
      current = advanceRivalGrowthWeek(current, 1, week, 2026, true);
    }
    const after = squadAverageStrength(
      buildRivalEngineSquad(
        template,
        current.filter((player) => player.club_id === clubId),
      ),
    );
    expect(after).toBeGreaterThanOrEqual(before - 0.25);
  });

  it("uses stable career ids per engine player", () => {
    const teamId = defaultLeaguePools()["regionalliga-nord"][1] ?? asTeamId("missing");
    const template = squadForLeagueClub(teamId)!;
    const enginePlayer = template.starters[0]!.player;
    expect(rivalCareerId(enginePlayer)).toBe(`rp_${enginePlayer.teamId}_${enginePlayer.shirt}`);
  });
});
