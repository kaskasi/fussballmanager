import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  applyProfileAction,
  applyProfileActionToSquad,
  profileMenuItems,
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
    const { player: next } = applyProfileAction(player, "praise");
    expect(next.state.morale).toBeGreaterThan(50);
  });

  it("promotes u19 to pro with morale hit when CA is low", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    player.state.morale = 60;
    player.attributes.passing = 40;
    const { player: next } = applyProfileAction(player, "promote_pro");
    expect(next.squad_status).toBe("pro");
    expect(next.state.morale).toBeLessThan(60);
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

  it("offers release for owned players", () => {
    const player = clonePlayer();
    const items = profileMenuItems(player, true);
    expect(items.some((item) => item.action === "release")).toBe(true);
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

  it("signs a youth contract from the profile menu", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.contract = null;
    player.state.morale = 50;
    const { player: next } = applyProfileAction(player, "sign_contract", 1);
    expect(next.contract?.wage_weekly).toBeGreaterThan(0);
    expect(next.state.morale).toBeGreaterThan(50);
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
