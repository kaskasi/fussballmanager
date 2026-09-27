import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  worldCareerClubId,
  type WorldClub,
} from "../world/world-generator.ts";
import {
  applyObservation,
  applyQuietWeek,
  confidenceLabel,
  type AbilityEstimate,
  type PlayerKnowledge,
} from "./estimate-model.ts";
import {
  initialEstimateForPlayer,
  loadMarketList,
  type ScoutedTarget,
} from "./market-list.ts";

export interface BoardTarget extends ScoutedTarget {
  assigned: boolean;
}

export interface ScoutKnowledgeTarget {
  playerId: string;
  estimate: AbilityEstimate;
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
  targets: Record<string, ScoutKnowledgeTarget>;
  recentReports?: ScoutReport[];
}

export function normalizeScoutBoard(board: ScoutBoard): ScoutBoard {
  const targets = Object.fromEntries(
    Object.entries(board.targets ?? {}).map(([playerId, target]) => [
      playerId,
      {
        playerId,
        estimate: target.estimate,
        assigned: target.assigned ?? false,
      },
    ]),
  );
  return {
    targets,
    recentReports: board.recentReports ?? [],
  };
}

export function createScoutBoard(players: readonly Player[] = []): ScoutBoard {
  const market = loadMarketList(players);
  return {
    targets: Object.fromEntries(
      market.map((target) => [
        target.player.id,
        {
          playerId: target.player.id,
          estimate: target.estimate,
          assigned: false,
        },
      ]),
    ),
    recentReports: [],
  };
}

/** Keep knowledge while replacing snapshots with the authoritative rival roster. */
export function reconcileScoutBoard(
  board: ScoutBoard,
  rivalPlayers: readonly Player[],
): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  const targets: Record<string, ScoutKnowledgeTarget> = {};
  for (const [index, player] of rivalPlayers.entries()) {
    if (player.squad_status !== "pro" || player.club_id === null) continue;
    const existing = normalized.targets[player.id];
    targets[player.id] = existing
      ? { ...existing, playerId: player.id }
      : {
          playerId: player.id,
          estimate: initialEstimateForPlayer(player, index),
          assigned: false,
        };
  }
  return { ...normalized, targets };
}

export function scoutReportsForWeek(board: ScoutBoard, week: number): ScoutReport[] {
  return (board.recentReports ?? []).filter((report) => report.week === week);
}

export function listBoardTargets(
  board: ScoutBoard,
  rivalPlayers: readonly Player[],
  clubs: readonly WorldClub[] = [],
): BoardTarget[] {
  const byId = new Map(rivalPlayers.map((player) => [player.id, player] as const));
  const clubNames = new Map(
    clubs.map((club) => [worldCareerClubId(club.id), club.name] as const),
  );
  return Object.values(board.targets).flatMap((target) => {
    const player = byId.get(target.playerId);
    return player
      ? [{
          player,
          estimate: target.estimate,
          assigned: target.assigned,
          clubName: player.club_id ? clubNames.get(player.club_id) : undefined,
        }]
      : [];
  });
}

export function getBoardTarget(
  board: ScoutBoard,
  playerId: string,
  rivalPlayers: readonly Player[],
): BoardTarget | null {
  const target = board.targets[playerId];
  const player = rivalPlayers.find((entry) => entry.id === playerId);
  return target && player
    ? { player, estimate: target.estimate, assigned: target.assigned }
    : null;
}

export function assignScout(board: ScoutBoard, playerId: string): ScoutBoard {
  const target = board.targets[playerId];
  if (!target) return board;
  return {
    ...board,
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
export function advanceScoutWeek(
  board: ScoutBoard,
  week: number,
  rivalPlayers: readonly Player[] = [],
): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  const targets: Record<string, ScoutKnowledgeTarget> = {};
  const reports: ScoutReport[] = [];
  const playersById = new Map(rivalPlayers.map((player) => [player.id, player] as const));

  for (const [playerId, target] of Object.entries(normalized.targets)) {
    const knowledge: PlayerKnowledge = { status: "scouted", estimate: target.estimate };
    const beforeRange = target.estimate.uncertaintyRange;
    const next = target.assigned
      ? applyObservation(knowledge, "scout_visit_report")
      : applyQuietWeek(knowledge);
    const estimate = next.status === "scouted" ? next.estimate : target.estimate;
    targets[playerId] = { ...target, playerId, estimate };

    if (target.assigned && next.status === "scouted") {
      const player = playersById.get(playerId);
      reports.push({
        id: `scout_${playerId}_${week}`,
        playerId,
        playerName: player ? formatPlayerName(player) : playerId,
        position: player?.position ?? "CM",
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
