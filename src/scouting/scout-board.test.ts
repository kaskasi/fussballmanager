import { describe, expect, it } from "vitest";
import {
  activeScoutCount,
  advanceScoutWeek,
  assignScout,
  createScoutBoard,
  getBoardTarget,
} from "./scout-board.ts";

describe("scout board", () => {
  it("loads market targets and can assign a scout", () => {
    const board = createScoutBoard();
    const first = listFirst(board);
    expect(first).not.toBeNull();
    const assigned = assignScout(board, first!.player.id);
    expect(getBoardTarget(assigned, first!.player.id)?.assigned).toBe(true);
    expect(activeScoutCount(assigned)).toBe(1);
  });

  it("narrows assigned targets each simulated week", () => {
    const board = createScoutBoard();
    const first = listFirst(board)!;
    const startRange = first.estimate.uncertaintyRange;
    let current = assignScout(board, first.player.id);
    current = advanceScoutWeek(current, 2);
    const after = getBoardTarget(current, first.player.id)!;
    expect(after.estimate.uncertaintyRange).toBeLessThan(startRange);
    expect(after.estimate.sampleSize).toBeGreaterThan(first.estimate.sampleSize);
  });

  it("creates scout reports for assigned targets", () => {
    const board = createScoutBoard();
    const first = listFirst(board)!;
    const assigned = assignScout(board, first.player.id);
    const next = advanceScoutWeek(assigned, 5);
    expect(next.recentReports?.length).toBe(1);
    expect(next.recentReports?.[0]?.week).toBe(5);
    expect(next.recentReports?.[0]?.playerId).toBe(first.player.id);
  });

  it("decays unassigned targets on a quiet week", () => {
    const board = createScoutBoard();
    const watched = Object.values(board.targets).find((target) => target.estimate.uncertaintyRange < 40)!;
    const startRange = watched.estimate.uncertaintyRange;
    const next = advanceScoutWeek(board, 2);
    const after = getBoardTarget(next, watched.player.id)!;
    expect(after.estimate.uncertaintyRange).toBe(startRange + 0.25);
  });
});

function listFirst(board: ReturnType<typeof createScoutBoard>) {
  return Object.values(board.targets)[0] ?? null;
}
