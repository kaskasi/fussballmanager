import { describe, expect, it } from "vitest";
import { asTeamId, NORDSTERN_ID } from "@fussballmanager/shared";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import { emptyTransferState } from "./negotiations.ts";
import {
  advanceAiTransferWeek,
  buyerEstimatedValue,
  normalizeAiBudgets,
  squadNeedPositions,
} from "./ai-transfer-market.ts";
import { sellerAskingPrice } from "./negotiations.ts";

describe("ai-transfer-market", () => {
  const rivals = initializeRivalPlayers(2026);
  const holzweg = rivals.find((player) => player.club_id === "cl_tsv_holzweg");

  it("detects squad position gaps", () => {
    const squad = rivals.filter((player) => player.club_id === holzweg?.club_id).slice(0, 8);
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
    const result = advanceAiTransferWeek({
      rivalPlayers: rivals,
      transferState: {
        ...emptyTransferState(),
        ai_budgets: normalizeAiBudgets(uniqueClubs, "regionalliga-nord"),
      },
      leagueClubIds: [
        NORDSTERN_ID,
        asTeamId("tsv-holzweg"),
        asTeamId("union-elbstrand"),
        asTeamId("vfb-moorsiel"),
        asTeamId("spvgg-kuestenholz"),
        asTeamId("sv-rheinwacht"),
      ],
      divisionId: "regionalliga-nord",
      season: 1,
      week: 28,
      masterSeed: 13,
    });
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.messages.length).toBe(result.records.length);
    const record = result.records[0]!;
    const beforeClub = rivals.find((player) => player.id === record.player_id)?.club_id;
    const afterClub = result.rivalPlayers.find((player) => player.id === record.player_id)?.club_id;
    expect(beforeClub).toBeTruthy();
    expect(afterClub).toBeTruthy();
    expect(afterClub).not.toBe(beforeClub);
  });

  it("skips outside transfer window", () => {
    const result = advanceAiTransferWeek({
      rivalPlayers: rivals,
      transferState: emptyTransferState(),
      leagueClubIds: [NORDSTERN_ID, asTeamId("tsv-holzweg")],
      divisionId: "regionalliga-nord",
      season: 1,
      week: 10,
      masterSeed: 2026,
    });
    expect(result.records).toHaveLength(0);
  });
});
