import { describe, expect, it } from "vitest";
import {
  contractMonthsRemaining,
  isPreContractWindow,
  PRE_CONTRACT_MONTHS,
} from "./contract-remaining.ts";

describe("contract-remaining", () => {
  it("opens the pre-contract window six months before expiry", () => {
    expect(PRE_CONTRACT_MONTHS).toBe(6);
    expect(isPreContractWindow(2, 20, 2)).toBe(true);
    expect(isPreContractWindow(1, 10, 3)).toBe(false);
  });

  it("returns zero months when the contract already ended", () => {
    expect(contractMonthsRemaining(3, 10, 2)).toBe(0);
  });
});
