import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { listTransferNextActions } from "./transfer-next-actions.ts";

describe("transfer next actions", () => {
  it("lists youth without a deal first", () => {
    const youth = clonePlayer();
    youth.id = "pl_youth";
    youth.squad_status = "u17";
    youth.age = 16;
    youth.contract = null;
    youth.name = { first: "Jonas", last: "Wolf" };
    const actions = listTransferNextActions({
      players: [youth],
      rivalPlayers: [],
      clubId: "cl_fc_nordstern",
      season: 1,
      week: 10,
      scoutTargetIds: [],
      pending: [],
    });
    expect(actions[0]?.kind).toBe("youth");
    expect(actions[0]?.hint).toBe("ohne Deal");
  });

  it("lists own deals in the last season as renew", () => {
    const player = clonePlayer();
    player.contract = { ...player.contract!, until_season: 1 };
    player.name = { first: "Samir", last: "Böttcher" };
    const actions = listTransferNextActions({
      players: [player],
      rivalPlayers: [],
      clubId: "cl_fc_nordstern",
      season: 1,
      week: 10,
      scoutTargetIds: [],
      pending: [],
    });
    expect(actions.some((entry) => entry.kind === "renew" && entry.playerId === player.id)).toBe(
      true,
    );
  });

  it("lists scouted rivals in the six-month window as pre-contract", () => {
    const rival = clonePlayer();
    rival.id = "pl_rival";
    rival.club_id = "cl_rival_a";
    rival.contract = { ...rival.contract!, until_season: 2 };
    rival.name = { first: "Can", last: "Çelik" };
    const actions = listTransferNextActions({
      players: [],
      rivalPlayers: [rival],
      clubId: "cl_fc_nordstern",
      season: 2,
      week: 20,
      scoutTargetIds: ["pl_rival"],
      pending: [],
    });
    expect(actions[0]?.kind).toBe("pre_contract");
    expect(actions[0]?.owned).toBe(false);
  });

  it("skips rivals that already have a pending pre-contract", () => {
    const rival = clonePlayer();
    rival.id = "pl_pending";
    rival.club_id = "cl_rival_a";
    rival.contract = { ...rival.contract!, until_season: 2 };
    const actions = listTransferNextActions({
      players: [],
      rivalPlayers: [rival],
      clubId: "cl_fc_nordstern",
      season: 2,
      week: 20,
      scoutTargetIds: ["pl_pending"],
      pending: [
        {
          id: "pre_1",
          player_id: "pl_pending",
          buyer_club_id: "cl_fc_nordstern",
          signing_bonus: 10_000,
          wage_weekly: 1_000,
          contract_until_season: 2,
          signed_season: 2,
          signed_week: 18,
          effective_season: 3,
          saved_transfer_fee: 80_000,
        },
      ],
    });
    expect(actions.some((entry) => entry.playerId === "pl_pending")).toBe(false);
  });

  it("falls back to the soonest own deal so the screen is never empty", () => {
    const player = clonePlayer();
    player.contract = { ...player.contract!, until_season: 5 };
    const actions = listTransferNextActions({
      players: [player],
      rivalPlayers: [],
      clubId: "cl_fc_nordstern",
      season: 1,
      week: 10,
      scoutTargetIds: [],
      pending: [],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe("renew");
  });
});
