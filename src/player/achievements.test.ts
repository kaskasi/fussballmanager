import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { ACHIEVEMENT, grantAchievement } from "./achievements.ts";

describe("player achievements", () => {
  it("appends a badge once", () => {
    const player = clonePlayer();
    const once = grantAchievement(player, ACHIEVEMENT.promotedU19);
    const twice = grantAchievement(once, ACHIEVEMENT.promotedU19);
    expect(once.history.achievements).toEqual([ACHIEVEMENT.promotedU19]);
    expect(twice.history.achievements).toEqual([ACHIEVEMENT.promotedU19]);
  });
});
