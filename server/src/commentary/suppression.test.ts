import { describe, expect, it } from "vitest";
import { shouldEmitPlayByPlay } from "./suppression.ts";

describe("shouldEmitPlayByPlay", () => {
  it("allows P0–P2 beats", () => {
    expect(shouldEmitPlayByPlay("shot_goal")).toBe(true);
    expect(shouldEmitPlayByPlay("pass_key")).toBe(true);
    expect(shouldEmitPlayByPlay("turnover")).toBe(true);
  });

  it("drops P3 filler beats", () => {
    expect(shouldEmitPlayByPlay("pass_complete")).toBe(false);
    expect(shouldEmitPlayByPlay("carry_progress")).toBe(false);
    expect(shouldEmitPlayByPlay("duel_won")).toBe(false);
  });
});
