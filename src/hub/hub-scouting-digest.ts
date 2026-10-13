import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { confidenceBucket } from "../scouting/market-list.ts";
import { opponentScoutJobProgress } from "../scouting/opponent-scout-job.ts";
import { opponentScoutMatchIdFromSetup } from "../scouting/opponent-scout-match-id.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import { countActiveScoutTrips } from "../scouting/scout-calendar-day.ts";

export interface HubScoutingDigest {
  activeMapTrips: number;
  poolKnown: number;
  poolUnclear: number;
  poolUnknown: number;
  opponentPrep: { done: number; total: number } | null;
}

export function buildHubScoutingDigest(
  scoutBoard: ScoutBoard,
  season: number,
  matchSetup: CareerMatchSetup | null,
): HubScoutingDigest {
  const poolIds = scoutBoard.discovery?.scout_pool ?? [];
  let poolKnown = 0;
  let poolUnclear = 0;
  let poolUnknown = 0;
  for (const playerId of poolIds) {
    const target = scoutBoard.targets[playerId];
    if (!target) continue;
    const bucket = confidenceBucket(target.estimate.uncertaintyRange);
    if (bucket === "known") poolKnown += 1;
    else if (bucket === "unclear") poolUnclear += 1;
    else poolUnknown += 1;
  }
  const trips = scoutBoard.active_scout_trips ?? [];

  let opponentPrep: HubScoutingDigest["opponentPrep"] = null;
  if (matchSetup) {
    const matchId = opponentScoutMatchIdFromSetup(season, matchSetup);
    const job =
      scoutBoard.active_opponent_scout?.match_id === matchId
        ? scoutBoard.active_opponent_scout
        : null;
    opponentPrep = opponentScoutJobProgress(job);
  }

  return {
    activeMapTrips: countActiveScoutTrips(trips),
    poolKnown,
    poolUnclear,
    poolUnknown,
    opponentPrep,
  };
}
