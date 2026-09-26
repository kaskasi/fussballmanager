import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  defaultYouthContract,
  needsYouthContract,
  signYouthContract,
} from "./youth-contract.ts";

describe("youth contract", () => {
  it("uses age-based wage bands", () => {
    expect(defaultYouthContract(15, 1).wage_weekly).toBe(80);
    expect(defaultYouthContract(16, 1).wage_weekly).toBe(120);
    expect(defaultYouthContract(17, 1).wage_weekly).toBe(175);
  });

  it("raises morale when a contract is signed", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.contract = null;
    player.state.morale = 40;
    const signed = signYouthContract(player, 1);
    expect(signed.contract?.wage_weekly).toBeGreaterThan(0);
    expect(signed.state.morale).toBeGreaterThan(40);
  });

  it("flags missing or expired youth contracts", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    player.contract = null;
    expect(needsYouthContract(player, 1)).toBe(true);
    player.contract = defaultYouthContract(17, 1);
    expect(needsYouthContract(player, 1)).toBe(false);
    player.contract = { ...player.contract, until_season: 1 };
    expect(needsYouthContract(player, 1)).toBe(true);
  });
});
