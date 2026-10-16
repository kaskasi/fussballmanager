import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  applyProfileAction,
  applyProfileActionToSquad,
  contractTerminationPayout,
  profileMenuItems,
  profileOverflowMenuItems,
} from "./profile-actions.ts";

describe("profile actions", () => {
  it("offers praise when form is good", () => {
    const player = clonePlayer();
    player.state.form = 3;
    const items = profileMenuItems(player, true);
    expect(items.some((item) => item.action === "praise")).toBe(true);
    expect(items.some((item) => item.action === "criticize")).toBe(false);
  });

  it("offers criticize when form is poor", () => {
    const player = clonePlayer();
    player.state.form = -2;
    const items = profileMenuItems(player, true);
    expect(items.some((item) => item.action === "criticize")).toBe(true);
  });

  it("raises morale on praise", () => {
    const player = clonePlayer();
    player.state.form = 3;
    player.state.morale = 50;
    const { player: next } = applyProfileAction(player, "praise", 1, 5);
    expect(next.state.morale).toBeGreaterThan(50);
    expect(next.state.last_praise_week).toBe(5);
  });

  it("blocks praise within a four-week cooldown", () => {
    const player = clonePlayer();
    player.state.form = 0;
    player.state.morale = 50;
    player.state.last_praise_season = 1;
    player.state.last_praise_week = 5;
    const { player: next, message } = applyProfileAction(player, "praise", 1, 7);
    expect(next.state.morale).toBe(50);
    expect(message).toContain("Wochen");
    expect(profileMenuItems(player, true, 1, 7).some((item) => item.action === "praise")).toBe(false);
    const { player: ready } = applyProfileAction(player, "praise", 1, 9);
    expect(ready.state.morale).toBeGreaterThan(50);
  });

  it("opens a contract talk instead of promoting u19 straight to the pro squad", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    player.state.morale = 60;
    const result = applyProfileAction(player, "promote_pro", 1, 12, [player]);
    expect(result.openContractTalk).toBe(true);
    expect(result.player.squad_status).toBe("u19");
  });

  it("gives a two-year contract when a player moves to U19", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.contract = null;
    const { player: next } = applyProfileAction(player, "promote_u19", 3, 4, [player]);
    expect(next.squad_status).toBe("u19");
    expect(next.contract?.until_season).toBe(5);
    expect(next.contract?.wage_weekly).toBeGreaterThan(0);
  });

  it("does not offer pro promotion from u17 profile menu", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    const items = profileMenuItems(player, true);
    expect(items.some((item) => item.action === "promote_u19")).toBe(true);
    expect(items.some((item) => item.action === "promote_pro")).toBe(false);
  });

  it("demotes young pro back to u19", () => {
    const player = clonePlayer();
    player.squad_status = "pro";
    player.age = 19;
    player.state.morale = 55;
    const { player: next } = applyProfileAction(player, "demote_u19");
    expect(next.squad_status).toBe("u19");
    expect(next.state.morale).toBeLessThan(55);
  });

  it("offers contract termination in the overflow menu", () => {
    const player = clonePlayer();
    expect(profileMenuItems(player, true).some((item) => item.action === "release")).toBe(false);
    const overflow = profileOverflowMenuItems(player, true);
    expect(overflow.some((item) => item.action === "release")).toBe(true);
    expect(overflow[0]?.label).toBe("Vertrag auflösen");
  });

  it("computes termination payout from remaining contract weeks", () => {
    const player = clonePlayer();
    player.contract = {
      wage_weekly: 1_000,
      bonus_goal: 0,
      bonus_appearance: 0,
      until_season: 3,
      guaranteed_minutes_promise: "none",
    };
    const payout = contractTerminationPayout(player, 1, 1);
    expect(payout).toBeGreaterThan(1_000);
  });

  it("removes a player from the squad on release", () => {
    const player = clonePlayer();
    player.id = "pl_release";
    player.squad_status = "pro";
    player.club_id = "cl_fc_nordstern";

    const squad = Array.from({ length: 12 }, (_, index) => {
      const copy = index === 0 ? player : clonePlayer();
      copy.id = `pl_pro_${index}`;
      copy.squad_status = "pro";
      copy.club_id = "cl_fc_nordstern";
      if (index > 0) copy.position = "CB";
      return copy;
    });

    const { players: next, result } = applyProfileActionToSquad(squad, "pl_pro_1", "release");
    expect(result?.removed).toBe(true);
    expect(next.some((entry) => entry.id === "pl_pro_1")).toBe(false);
    expect(next.length).toBe(squad.length - 1);
  });

  it("does not one-click sign youth contracts from profile actions", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.contract = null;
    player.state.morale = 50;
    const { player: next, message } = applyProfileAction(player, "sign_contract", 1);
    expect(next.contract).toBeNull();
    expect(next.state.morale).toBe(50);
    expect(message).toContain("Verhandeln");
  });

  it("blocks release when the pro squad would drop below 11", () => {
    const squad = Array.from({ length: 11 }, (_, index) => {
      const copy = clonePlayer();
      copy.id = `pl_min_${index}`;
      copy.squad_status = "pro";
      copy.club_id = "cl_fc_nordstern";
      copy.position = index === 0 ? "GK" : "CB";
      return copy;
    });

    const { players: next, result } = applyProfileActionToSquad(squad, "pl_min_1", "release");
    expect(next.length).toBe(11);
    expect(result?.removed).toBeUndefined();
    expect(result?.message).toContain("11");
  });
});
