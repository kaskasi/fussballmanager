import { describe, expect, it } from "vitest";
import { clonePlayer } from "./__tests__/fixtures.ts";
import {
  formatPlayerPositionLabel,
  learnedPositions,
  playerPlaysPosition,
  playerPositionSet,
} from "./player-display.ts";

describe("formatPlayerPositionLabel", () => {
  it("shows primary only without flexibility", () => {
    const player = clonePlayer();
    expect(formatPlayerPositionLabel(player)).toBe("CM");
  });

  it("appends learned positions after successful retrain", () => {
    const player = clonePlayer();
    player.position = "AM";
    player.flexibility = [{ trained_as: "RM", proficiency: 1, weeks_trained: 8 }];
    expect(formatPlayerPositionLabel(player)).toBe("AM · RM");
    expect(learnedPositions(player)).toEqual(["RM"]);
    expect(playerPlaysPosition(player, "RM")).toBe(true);
    expect(playerPositionSet(player)).toEqual(["AM", "RM"]);
  });

  it("hides low proficiency slots from the label", () => {
    const player = clonePlayer();
    player.position = "AM";
    player.flexibility = [{ trained_as: "RM", proficiency: 0.2, weeks_trained: 4 }];
    expect(formatPlayerPositionLabel(player)).toBe("AM");
  });
});
