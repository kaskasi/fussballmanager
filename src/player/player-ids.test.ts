import { describe, expect, it } from "vitest";
import { allocateFreePlayerIds, nextNumericIdHint, reassignClashingIds } from "./player-ids.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";

describe("player id allocation (PRD 31)", () => {
  it("skips used ids and wraps at pl_99999", () => {
    const used = new Set(["pl_99998", "pl_00000"]);
    expect(allocateFreePlayerIds(used, 3, 99_998)).toEqual(["pl_99999", "pl_00001", "pl_00002"]);
  });

  it("hints one past the highest five-digit id", () => {
    expect(nextNumericIdHint([{ id: "pl_00041" }, { id: "pl_s2c1n0" }, { id: "pl_00007" }])).toBe(42);
  });

  it("only moves ids that clash", () => {
    const players = [
      { ...clonePlayer(), id: "pl_00001" },
      { ...clonePlayer(), id: "pl_00002" },
    ];
    const next = reassignClashingIds(players, new Set(["pl_00001"]));
    expect(next.map((player) => player.id)).toEqual(["pl_00003", "pl_00002"]);
  });
});
