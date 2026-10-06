import { describe, expect, it } from "vitest";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import { createScoutAssignment } from "./scout-assignments.ts";
import {
  activeScoutCount,
  addScoutAssignment,
  advanceScoutWeek,
  assignScout,
  createScoutBoard,
  getBoardTarget,
  listBoardTargets,
  reconcileScoutBoard,
  syncAssignmentTargets,
} from "./scout-board.ts";
import {
  addPlayersToPool,
  ensureTargetsForPool,
  normalizeDiscovery,
} from "./scout-discovery.ts";

describe("scout board", () => {
  const rivals = initializeRivalPlayers(2026);

  it("loads market targets and can assign a scout", () => {
    const board = withPool(createScoutBoard(rivals), rivals);
    const first = listBoardTargets(board, rivals)[0] ?? null;
    expect(first).not.toBeNull();
    const assigned = assignScout(board, first!.player.id);
    expect(getBoardTarget(assigned, first!.player.id, rivals)?.assigned).toBe(true);
    expect(activeScoutCount(assigned)).toBe(1);
  });

  it("narrows assigned targets each simulated week", () => {
    const board = withPool(createScoutBoard(rivals), rivals);
    const first = listBoardTargets(board, rivals)[0]!;
    const startRange = first.estimate.uncertaintyRange;
    let current = assignScout(board, first.player.id);
    current = advanceScoutWeek(current, 2, rivals);
    const after = getBoardTarget(current, first.player.id, rivals)!;
    expect(after.estimate.uncertaintyRange).toBeLessThan(startRange);
    expect(after.estimate.sampleSize).toBeGreaterThan(first.estimate.sampleSize);
  });

  it("creates scout reports for assigned targets", () => {
    const board = withPool(createScoutBoard(rivals), rivals);
    const first = listBoardTargets(board, rivals)[0]!;
    const assigned = assignScout(board, first.player.id);
    const next = advanceScoutWeek(assigned, 5, rivals);
    expect(next.recentReports?.length).toBe(1);
    expect(next.recentReports?.[0]?.week).toBe(5);
    expect(next.recentReports?.[0]?.playerId).toBe(first.player.id);
  });

  it("decays unassigned targets on a quiet week", () => {
    const board = withPool(createScoutBoard(rivals), rivals);
    const watched = Object.values(board.targets).find((target) => target.estimate.uncertaintyRange < 40)!;
    const startRange = watched.estimate.uncertaintyRange;
    const next = advanceScoutWeek(board, 2, rivals);
    const after = getBoardTarget(next, watched.playerId, rivals)!;
    expect(after.estimate.uncertaintyRange).toBe(startRange + 0.25);
  });

  it("auto-assigns targets from criteria-based scout assignments", () => {
    const board = withPool(createScoutBoard(rivals), rivals);
    const young = rivals.find((player) => player.age <= 21);
    expect(young).toBeDefined();
    const withAssignment = addScoutAssignment(
      board,
      createScoutAssignment("assign_u21", { age: "u21" }),
    );
    const synced = syncAssignmentTargets(withAssignment, rivals);
    expect(activeScoutCount(synced)).toBeGreaterThan(0);
  });

  it("keeps knowledge while following authoritative roster changes", () => {
    const board = withPool(createScoutBoard(rivals), rivals);
    const first = listBoardTargets(board, rivals)[0]!;
    const assigned = assignScout(board, first.player.id);
    const moved = rivals.map((player) =>
      player.id === first.player.id
        ? { ...player, club_id: "cl_world_new_club" }
        : player,
    );
    const reconciled = reconcileScoutBoard(assigned, moved);
    const target = getBoardTarget(reconciled, first.player.id, moved);

    expect(target?.assigned).toBe(true);
    expect(target?.player.club_id).toBe("cl_world_new_club");
    expect("player" in reconciled.targets[first.player.id]!).toBe(false);
    expect(
      reconcileScoutBoard(reconciled, moved.filter((player) => player.id !== first.player.id))
        .targets[first.player.id],
    ).toBeUndefined();
  });
});

function withPool(
  board: ReturnType<typeof createScoutBoard>,
  rivals: ReturnType<typeof initializeRivalPlayers>,
  playerIds?: string[],
) {
  const ids = playerIds ?? rivals.map((player) => player.id);
  const discovery = addPlayersToPool(normalizeDiscovery(board.discovery), ids);
  const targets = ensureTargetsForPool(board.targets, discovery, rivals);
  return { ...board, discovery, targets };
}

function listFirst(board: ReturnType<typeof createScoutBoard>) {
  const rivals = initializeRivalPlayers(2026);
  return listBoardTargets(withPool(board, rivals), rivals)[0] ?? null;
}
