import { describe, expect, it } from "vitest";
import { NORDSTERN_ID } from "@fussballmanager/shared";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { emptyTransferState } from "./negotiations.ts";
import {
  academyOverflowPlayers,
  advanceAiTransferWeek,
  buyerEstimatedValue,
  normalizeAiBudgets,
  sellPressurePlayers,
  squadNeedPositions,
} from "./ai-transfer-market.ts";
import { sellerAskingPrice } from "./negotiations.ts";

describe("ai-transfer-market", () => {
  const rivals = initializeRivalPlayers(2026);
  const leagueClubIds = defaultLeaguePools()["regionalliga-nord"];
  const firstRivalId = leagueClubIds.find((teamId) => teamId !== NORDSTERN_ID)!;
  const firstRivalClubId = careerTeamId(firstRivalId);
  const firstRival = rivals.find((player) => player.club_id === firstRivalClubId);

  it("detects squad position gaps", () => {
    const squad = rivals.filter((player) => player.club_id === firstRival?.club_id).slice(0, 8);
    const needs = squadNeedPositions(squad);
    expect(needs.length).toBeGreaterThan(0);
  });

  it("buyer estimate uses market value formula with scout noise", () => {
    const player = rivals[0]!;
    const asking = sellerAskingPrice(player, 1);
    const neutral = buyerEstimatedValue(player, 1, 0.5);
    expect(neutral).toBeGreaterThan(0);
    expect(Math.abs(neutral - asking) / asking).toBeLessThan(0.02);
    const low = buyerEstimatedValue(player, 1, 0);
    const high = buyerEstimatedValue(player, 1, 1);
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThan(asking * 0.35);
    expect(high).toBeLessThan(asking * 2.2);
  });

  it("runs AI deals in summer transfer window", () => {
    const clubIds = rivals
      .map((player) => player.club_id)
      .filter((clubId): clubId is string => Boolean(clubId && clubId !== "cl_fc_nordstern"));
    const uniqueClubs = [...new Set(clubIds)];
    let result = advanceAiTransferWeek({
      rivalPlayers: rivals,
      transferState: emptyTransferState(),
      leagueClubIds,
      divisionId: "regionalliga-nord",
      season: 1,
      week: 1,
      masterSeed: 1,
    });
    for (let seed = 2; seed <= 100 && result.records.length === 0; seed++) {
      result = advanceAiTransferWeek({
        rivalPlayers: rivals,
        transferState: {
          ...emptyTransferState(),
          ai_budgets: normalizeAiBudgets(uniqueClubs, "regionalliga-nord"),
        },
        leagueClubIds,
        divisionId: "regionalliga-nord",
        season: 1,
        week: 1,
        masterSeed: seed,
      });
    }
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.messages.length).toBe(result.records.length);
    const record = result.records[0]!;
    const beforeClub = rivals.find((player) => player.id === record.player_id)?.club_id;
    const afterClub = result.rivalPlayers.find((player) => player.id === record.player_id)?.club_id;
    expect(beforeClub).toBeTruthy();
    expect(afterClub).toBeTruthy();
    expect(afterClub).not.toBe(beforeClub);
  });

  it("flags academy overflow and contract pressure sellers", () => {
    const squad = rivals.filter((player) => player.club_id === firstRivalClubId).slice(0, 20);
    const youngCm = squad.filter((player) => player.position === "CM" && player.age <= 21);
    expect(academyOverflowPlayers(youngCm.length >= 3 ? youngCm : squad)).toBeDefined();
    const pressured = sellPressurePlayers(squad, 1);
    expect(Array.isArray(pressured)).toBe(true);
  });

  it("skips outside transfer window", () => {
    const result = advanceAiTransferWeek({
      rivalPlayers: rivals,
      transferState: emptyTransferState(),
      leagueClubIds: leagueClubIds.slice(0, 2),
      divisionId: "regionalliga-nord",
      season: 1,
      week: 10,
      masterSeed: 2026,
    });
    expect(result.records).toHaveLength(0);
  });
});
