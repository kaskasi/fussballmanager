import type { Player } from "../types/player.ts";
import {
  applyObservation,
  applyQuietWeek,
  type AbilityEstimate,
  type PlayerKnowledge,
} from "./estimate-model.ts";
import { loadMarketList, type ScoutedTarget } from "./market-list.ts";

export interface BoardTarget extends ScoutedTarget {
  assigned: boolean;
}

export interface ScoutBoard {
  targets: Record<string, BoardTarget>;
}

export function createScoutBoard(): ScoutBoard {
  const market = loadMarketList();
  return {
    targets: Object.fromEntries(
      market.map((target) => [
        target.player.id,
        { ...target, assigned: false },
      ]),
    ),
  };
}

export function listBoardTargets(board: ScoutBoard): BoardTarget[] {
  return Object.values(board.targets);
}

export function getBoardTarget(board: ScoutBoard, playerId: string): BoardTarget | null {
  return board.targets[playerId] ?? null;
}

export function assignScout(board: ScoutBoard, playerId: string): ScoutBoard {
  const target = board.targets[playerId];
  if (!target) return board;
  return {
    targets: {
      ...board.targets,
      [playerId]: { ...target, assigned: true },
    },
  };
}

export function activeScoutCount(board: ScoutBoard): number {
  return Object.values(board.targets).filter((target) => target.assigned).length;
}

/** One hub week: assigned targets get a visit report; everyone else decays quietly. */
export function advanceScoutWeek(board: ScoutBoard): ScoutBoard {
  const targets: Record<string, BoardTarget> = {};
  for (const [playerId, target] of Object.entries(board.targets)) {
    const knowledge: PlayerKnowledge = { status: "scouted", estimate: target.estimate };
    const next = target.assigned
      ? applyObservation(knowledge, "scout_visit_report")
      : applyQuietWeek(knowledge);
    targets[playerId] = {
      ...target,
      estimate: next.status === "scouted" ? next.estimate : target.estimate,
    };
  }
  return { targets };
}

export function boardTargetFromPlayer(player: Player, estimate: AbilityEstimate, assigned = false): BoardTarget {
  return { player, estimate, assigned };
}
