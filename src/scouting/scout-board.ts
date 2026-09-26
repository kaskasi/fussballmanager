import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  applyObservation,
  applyQuietWeek,
  confidenceLabel,
  type AbilityEstimate,
  type PlayerKnowledge,
} from "./estimate-model.ts";
import { loadMarketList, type ScoutedTarget } from "./market-list.ts";

export interface BoardTarget extends ScoutedTarget {
  assigned: boolean;
}

export interface ScoutReport {
  id: string;
  playerId: string;
  playerName: string;
  position: PositionPrimary;
  week: number;
  estimatedCa: number;
  uncertaintyRange: number;
  uncertaintyDelta: number;
  confidence: string;
}

export interface ScoutBoard {
  targets: Record<string, BoardTarget>;
  recentReports?: ScoutReport[];
}

export function normalizeScoutBoard(board: ScoutBoard): ScoutBoard {
  return {
    ...board,
    recentReports: board.recentReports ?? [],
  };
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
    recentReports: [],
  };
}

export function scoutReportsForWeek(board: ScoutBoard, week: number): ScoutReport[] {
  return (board.recentReports ?? []).filter((report) => report.week === week);
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
export function advanceScoutWeek(board: ScoutBoard, week: number): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  const targets: Record<string, BoardTarget> = {};
  const reports: ScoutReport[] = [];

  for (const [playerId, target] of Object.entries(normalized.targets)) {
    const knowledge: PlayerKnowledge = { status: "scouted", estimate: target.estimate };
    const beforeRange = target.estimate.uncertaintyRange;
    const next = target.assigned
      ? applyObservation(knowledge, "scout_visit_report")
      : applyQuietWeek(knowledge);
    const estimate = next.status === "scouted" ? next.estimate : target.estimate;
    targets[playerId] = { ...target, estimate };

    if (target.assigned && next.status === "scouted") {
      reports.push({
        id: `scout_${playerId}_${week}`,
        playerId,
        playerName: formatPlayerName(target.player),
        position: target.player.position,
        week,
        estimatedCa: Math.round(estimate.estimatedAbilityMean),
        uncertaintyRange: estimate.uncertaintyRange,
        uncertaintyDelta: estimate.uncertaintyRange - beforeRange,
        confidence: confidenceLabel(next) ?? "👁️ Bericht",
      });
    }
  }

  return {
    targets,
    recentReports: [...reports, ...(normalized.recentReports ?? [])].slice(0, 24),
  };
}

export function boardTargetFromPlayer(player: Player, estimate: AbilityEstimate, assigned = false): BoardTarget {
  return { player, estimate, assigned };
}
