import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyProfileAction, profileMenuItems } from "./profile-actions.ts";

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
});
