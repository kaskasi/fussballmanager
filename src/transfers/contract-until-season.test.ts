import { describe, expect, it } from "vitest";
import { contractUntilSeasonAfterTerm } from "./contract-until-season.ts";

describe("contractUntilSeasonAfterTerm", () => {
  it("matches loan semantics for one season", () => {
    expect(contractUntilSeasonAfterTerm(5, 1)).toBe(6);
  });

  it("rounds term years and enforces minimum one season", () => {
    expect(contractUntilSeasonAfterTerm(2, 3)).toBe(5);
    expect(contractUntilSeasonAfterTerm(2, 0)).toBe(3);
  });
});
