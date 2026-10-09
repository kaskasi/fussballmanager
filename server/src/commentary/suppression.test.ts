import { describe, expect, it } from "vitest";
import { shouldEmitMoment, shouldEmitPlayByPlay } from "./suppression.ts";

describe("shouldEmitPlayByPlay", () => {
  it("allows high-signal beats only", () => {
    expect(shouldEmitPlayByPlay("shot_goal")).toBe(true);
    expect(shouldEmitPlayByPlay("match_opening")).toBe(true);
    expect(shouldEmitPlayByPlay("card_yellow")).toBe(true);
    expect(shouldEmitPlayByPlay("pass_key")).toBe(false);
    expect(shouldEmitPlayByPlay("turnover")).toBe(false);
  });

  it("drops routine open-play beats", () => {
    expect(shouldEmitPlayByPlay("pass_complete")).toBe(false);
    expect(shouldEmitPlayByPlay("carry_progress")).toBe(false);
    expect(shouldEmitPlayByPlay("duel_won")).toBe(false);
    expect(shouldEmitPlayByPlay("restart_corner")).toBe(false);
  });
});

describe("shouldEmitMoment", () => {
  it("marks set-piece and offside beats", () => {
    expect(shouldEmitMoment("restart_corner")).toBe(true);
    expect(shouldEmitMoment("offside")).toBe(true);
    expect(shouldEmitMoment("shot_saved")).toBe(false);
  });
});
