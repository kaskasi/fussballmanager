import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceUnderpaidContractWeek,
  isUnderpaid,
  underpaidMoraleCap,
  UNDERPAID_WAGE_RATIO,
} from "./underpaid-contract.ts";
import { playerContractAsk } from "./contract-talks.ts";

describe("underpaid-contract", () => {
  it("detects wage below fair ask threshold", () => {
    const player = { ...clonePlayer(), squad_status: "pro" as const };
    const fair = playerContractAsk(player, 1).wageWeekly;
    const underpaid = {
      ...player,
      contract: {
        ...player.contract!,
        wage_weekly: Math.floor(fair * UNDERPAID_WAGE_RATIO) - 1,
      },
    };
    expect(isUnderpaid(underpaid, 1)).toBe(true);
  });

  it("fires inbox prompts at 3, 9, and 12 months underpaid", () => {
    const player = { ...clonePlayer(), squad_status: "pro" as const };
    const fair = playerContractAsk(player, 1).wageWeekly;
    const underpaidBase = {
      ...player,
      contract: {
        ...player.contract!,
        wage_weekly: Math.floor(fair * 0.5),
      },
      state: {
        ...player.state,
        contract_underpaid_since_day: 0,
        contract_renegotiation_prompts: 0,
      },
    };

    const at3 = advanceUnderpaidContractWeek(underpaidBase, 1, { season: 1, week: 14, weekday: 1 });
    expect(at3.newPromptMonth).toBe(3);
    expect(at3.player.state.contract_renegotiation_prompts).toBe(3);

    const at9 = advanceUnderpaidContractWeek(
      { ...at3.player, state: { ...at3.player.state, contract_renegotiation_prompts: 3 } },
      1,
      { season: 2, week: 7, weekday: 1 },
    );
    expect(at9.newPromptMonth).toBe(9);

    const at12 = advanceUnderpaidContractWeek(
      { ...at9.player, state: { ...at9.player.state, contract_renegotiation_prompts: 9 } },
      1,
      { season: 2, week: 20, weekday: 1 },
    );
    expect(at12.newPromptMonth).toBe(12);
  });

  it("demoralizes after 12 months without renegotiation", () => {
    const player = { ...clonePlayer(), squad_status: "pro" as const };
    const fair = playerContractAsk(player, 1).wageWeekly;
    const demoralizeCandidate = {
      ...player,
      contract: {
        ...player.contract!,
        wage_weekly: Math.floor(fair * 0.5),
      },
      state: {
        ...player.state,
        contract_underpaid_since_day: 0,
        contract_renegotiation_prompts: 12,
        morale: 70,
      },
    };
    const result = advanceUnderpaidContractWeek(demoralizeCandidate, 1, {
      season: 2,
      week: 20,
      weekday: 1,
    });
    expect(result.player.state.contract_demoralized).toBe(true);
    expect(result.player.state.morale).toBeLessThanOrEqual(35);
    expect(underpaidMoraleCap(result.player)).toBe(45);
  });
});
