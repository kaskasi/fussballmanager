import {
  standings,
  type FixtureResult,
  type TeamId,
} from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { totalSeasonMatchdays } from "../persistence/league-state.ts";
import { t } from "../i18n/index.ts";
import { clubShortName } from "./league-week.ts";
import { divisionLabel } from "./league-divisions.ts";
import {
  divisionSeasonSeed,
  seededRoll,
  simulateFullDivisionSeason,
  teamStrength,
} from "./division-matchday.ts";

export {
  divisionSeasonSeed,
  simulateDivisionMatchday,
  simulateFullDivisionSeason,
  simulatePartialDivisionSeason,
} from "./division-matchday.ts";
import {
  divisionBelow,
  divisionOfClub,
  emptyDivisionPools,
  PYRAMID,
  type DivisionId,
} from "./league-pyramid.ts";
import type { Player } from "../types/player.ts";

export interface PromotionMovement {
  teamId: TeamId;
  from: DivisionEconomyId;
  to: DivisionEconomyId;
  reason: "promoted" | "relegated" | "playoff_won" | "playoff_lost";
}

export interface PlayoffResult {
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeGoals: number;
  awayGoals: number;
  winnerId: TeamId;
  upperDivisionId: DivisionId;
  lowerDivisionId: DivisionId;
}

export interface PromotionRelegationResult {
  pools: Record<DivisionEconomyId, TeamId[]>;
  movements: PromotionMovement[];
  /** Every playoff of the season, top boundary first. */
  playoffs: PlayoffResult[];
  messages: string[];
}

function simulatePlayoffMatch(
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  seed: number,
  rivalPlayers?: readonly Player[],
): FixtureResult {
  const homeStrength = teamStrength(homeTeamId, rivalPlayers);
  const awayStrength = teamStrength(awayTeamId, rivalPlayers);
  const edge = (homeStrength - awayStrength) / 18;
  const homeGoals = Math.min(
    4,
    Math.max(0, Math.round(1.2 + edge + seededRoll(seed, 91) * 2)),
  );
  const awayGoals = Math.min(
    4,
    Math.max(0, Math.round(0.9 - edge * 0.5 + seededRoll(seed, 93) * 2)),
  );
  return { homeTeamId, awayTeamId, homeGoals, awayGoals };
}

/** Final table order of every division: the player's from its results, the rest batch-simulated. */
function finalTables(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  masterSeed: number,
  season: number,
  rivalPlayers?: readonly Player[],
): Map<DivisionId, TeamId[]> {
  const tables = new Map<DivisionId, TeamId[]>();
  for (const division of PYRAMID) {
    const ids = [...(pools[division.id] ?? [])];
    const live = league.division_results?.[division.id] ?? [];
    const fullSeason = totalSeasonMatchdays({ club_ids: ids, meetings_per_opponent: league.meetings_per_opponent });
    const liveComplete = live.length >= (fullSeason * ids.length) / 2;
    // Live results when the season was played week by week (PRD 32 §7); the
    // batch only for leagues without them (tests, saves from before slice 3).
    const results =
      league.division_id === division.id
        ? league.results
        : liveComplete
          ? live
          : simulateFullDivisionSeason(
              ids,
              league.meetings_per_opponent,
              divisionSeasonSeed(masterSeed, season, division.id),
              rivalPlayers,
            );
    tables.set(division.id, standings(ids, results).map((row) => row.teamId));
  }
  return tables;
}

/**
 * PRD 32 §3 — season-end movements over every boundary of the pyramid, top
 * to bottom, from final tables: `direct` clubs swap places, then the playoff
 * (first place above the drop zone at home vs first place below the direct
 * promotion places). A club sits in exactly one boundary per season.
 */
export function applyPromotionRelegation(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  masterSeed: number,
  season: number,
  rivalPlayers?: readonly Player[],
): PromotionRelegationResult {
  const tables = finalTables(league, pools, masterSeed, season, rivalPlayers);
  const nextPools = emptyDivisionPools<TeamId>();
  for (const division of PYRAMID) nextPools[division.id] = [...(pools[division.id] ?? [])];
  const movements: PromotionMovement[] = [];
  const messages: string[] = [];
  const playoffs: PlayoffResult[] = [];

  for (const division of PYRAMID) {
    const boundary = division.boundaryBelow;
    const upperId = division.id;
    const lowerId = divisionBelow(upperId);
    if (!boundary || !lowerId) continue;
    // Club events only for the boundaries the manager's division touches.
    const announce = league.division_id === upperId || league.division_id === lowerId;
    const upperTable = tables.get(upperId) ?? [];
    const lowerTable = tables.get(lowerId) ?? [];

    for (let slot = 0; slot < boundary.direct; slot++) {
      const relegated = upperTable[upperTable.length - 1 - slot];
      const promoted = lowerTable[slot];
      if (!relegated || !promoted) continue;
      swapClub(nextPools, upperId, lowerId, relegated, promoted);
      movements.push(
        { teamId: promoted, from: lowerId, to: upperId, reason: "promoted" },
        { teamId: relegated, from: upperId, to: lowerId, reason: "relegated" },
      );
      if (announce) {
        messages.push(
          t("clubEvent.promoted", { club: clubShortName(promoted), division: divisionLabel(upperId) }),
          t("clubEvent.relegated", { club: clubShortName(relegated), division: divisionLabel(lowerId) }),
        );
      }
    }

    if (!boundary.playoff) continue;
    const upperPlayoff = upperTable[upperTable.length - 1 - boundary.direct];
    const lowerPlayoff = lowerTable[boundary.direct];
    if (!upperPlayoff || !lowerPlayoff) continue;
    const match = simulatePlayoffMatch(
      upperPlayoff,
      lowerPlayoff,
      masterSeed ^ season ^ boundary.playoffSalt,
      rivalPlayers,
    );
    const winnerId = match.homeGoals >= match.awayGoals ? match.homeTeamId : match.awayTeamId;
    if (winnerId === lowerPlayoff) {
      swapClub(nextPools, upperId, lowerId, upperPlayoff, lowerPlayoff);
      movements.push(
        { teamId: lowerPlayoff, from: lowerId, to: upperId, reason: "playoff_won" },
        { teamId: upperPlayoff, from: upperId, to: lowerId, reason: "playoff_lost" },
      );
    }
    playoffs.push({ ...match, winnerId, upperDivisionId: upperId, lowerDivisionId: lowerId });
    if (!announce) continue;
    messages.push(
      t("clubEvent.playoff", {
        home: clubShortName(match.homeTeamId),
        away: clubShortName(match.awayTeamId),
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
      }),
    );
  }

  return { pools: nextPools, movements, playoffs, messages };
}

function swapClub(
  pools: Record<DivisionEconomyId, TeamId[]>,
  upperId: DivisionEconomyId,
  lowerId: DivisionEconomyId,
  upperTeamId: TeamId,
  lowerTeamId: TeamId,
): void {
  const upper = pools[upperId];
  const lower = pools[lowerId];
  const upperIndex = upper.indexOf(upperTeamId);
  const lowerIndex = lower.indexOf(lowerTeamId);
  if (upperIndex < 0 || lowerIndex < 0) return;
  upper[upperIndex] = lowerTeamId;
  lower[lowerIndex] = upperTeamId;
}

export function leagueStateAfterMovement(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  playerClubId: TeamId,
): LeagueState {
  const division_id = divisionOfClub(pools, playerClubId) ?? league.division_id;
  return {
    ...league,
    division_id,
    league_pools: pools,
    club_ids: [...(pools[division_id] ?? league.club_ids)],
  };
}
