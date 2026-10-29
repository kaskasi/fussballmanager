/**
 * Regionalliga Manager club pick (PRD 24): start the career at any of the 36 clubs.
 * The story frame follows the club's squad-strength tier — only bottom clubs get the
 * relegation battle; the sim and the club layer stay unchanged.
 */

import type { TeamId } from "@fussballmanager/shared";
import { switchManagerClub } from "../board/manager-club-switch.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { tierForPlace, type ClubStandingTier } from "../board/club-standing-tier.ts";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { clubDisplayName, defaultLeaguePools, divisionLabel } from "../sim/league-divisions.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { applySurvivalObjectivesToBoard } from "./season-objectives.ts";
import type { ActiveArc } from "./story-state.ts";
import { bottomDivisionId, careerStartDivisionIds } from "../sim/league-pyramid.ts";

export interface CareerClubChoice {
  teamId: TeamId;
  name: string;
  divisionId: DivisionEconomyId;
  divisionLabel: string;
  /** Average CA of the professional squad. */
  avgCa: number;
  /** 1 = strongest squad in its division. */
  strengthRank: number;
  clubCount: number;
  tier: ClubStandingTier;
  arc: ActiveArc;
}

function averageCa(players: readonly Player[], careerClubId: string): number {
  const pros = players.filter(
    (player) => player.club_id === careerClubId && player.squad_status === "pro",
  );
  if (pros.length === 0) return 0;
  const sum = pros.reduce((total, player) => total + estimateCa(player.attributes, player.position), 0);
  return Math.round((sum / pros.length) * 10) / 10;
}

export function careerArcForChoice(divisionId: DivisionEconomyId, tier: ClubStandingTier): ActiveArc {
  if (divisionId === bottomDivisionId()) return "promotion_push";
  return tier === "survival_low" || tier === "survival_mid" ? "relegation_battle" : "club_ambition";
}

/** All 36 clubs, ranked by squad strength inside their division. */
export function careerClubChoices(session: GameSession): CareerClubChoice[] {
  const pools = session.league.league_pools ?? defaultLeaguePools();
  const squads = [...session.players, ...session.rivalPlayers];
  const choices: CareerClubChoice[] = [];
  for (const divisionId of careerStartDivisionIds()) {
    const ranked = (pools[divisionId] ?? [])
      .map((teamId) => ({ teamId, avgCa: averageCa(squads, careerTeamId(teamId)) }))
      .sort((left, right) => right.avgCa - left.avgCa || left.teamId.localeCompare(right.teamId));
    ranked.forEach(({ teamId, avgCa }, index) => {
      const tier = tierForPlace(index + 1);
      choices.push({
        teamId,
        name: clubDisplayName(teamId, session.world.clubs),
        divisionId,
        divisionLabel: divisionLabel(divisionId),
        avgCa,
        strengthRank: index + 1,
        clubCount: ranked.length,
        tier,
        arc: careerArcForChoice(divisionId, tier),
      });
    });
  }
  return choices;
}

/**
 * Move a fresh career to the picked club before the opening runs. Kieler FC (the default)
 * keeps its survival story untouched.
 */
export function startCareerAtClub(session: GameSession, teamId: TeamId): GameSession {
  if (teamId === session.league.player_club_id) return session;
  const choice = careerClubChoices(session).find((entry) => entry.teamId === teamId);
  if (!choice) return session;

  const switched = switchManagerClub(session, teamId);
  let board = startBoardSeason(
    { ...switched.board, job_status: "employed", pressure: 0 },
    teamId,
    switched.season,
    switched.league,
    switched,
    choice.tier,
  );
  if (choice.arc === "relegation_battle") {
    board = {
      ...board,
      objectives: applySurvivalObjectivesToBoard(board.objectives, switched.season, teamId),
    };
  }
  // Opening market was built for the old club — never offer the manager his own players.
  const ownIds = new Set(switched.players.map((player) => player.id));
  const transferState = {
    ...switched.transferState,
    listings: (switched.transferState.listings ?? []).filter(
      (listing) => listing.club_id !== switched.clubId && !ownIds.has(listing.player_id),
    ),
    opening_market_player_ids: (switched.transferState.opening_market_player_ids ?? []).filter(
      (id) => !ownIds.has(id),
    ),
  };
  return {
    ...switched,
    board,
    transferState,
    storyState: {
      ...switched.storyState,
      active_arc: choice.arc,
      arc_started_week: switched.week,
    },
  };
}
