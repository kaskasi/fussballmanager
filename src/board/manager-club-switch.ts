import type { TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { resetClubPipelineForTeam, seedYouthSquad } from "./club-pipeline-reset.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { leagueStateAfterMovement } from "../sim/promotion-relegation.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { rivalPlayersForTeam } from "../sim/rival-engine-squad.ts";

export interface SwitchManagerClubOptions {
  /** When false, only swap squads/league (sync path). Default true for job accept. */
  resetPipeline?: boolean;
}

/** Move the manager to a new club: league id, squad, rival pool, and club infrastructure. */
export function switchManagerClub(
  session: GameSession,
  newTeamId: TeamId,
  options?: SwitchManagerClubOptions,
): GameSession {
  const oldTeamId = session.league.player_club_id;
  const oldCareerId = session.clubId;
  const newCareerId = careerTeamId(newTeamId);

  if (newTeamId === oldTeamId) return session;

  const oldPros = session.players.filter(
    (player) => player.squad_status === "pro" && player.club_id === oldCareerId,
  );
  const newPros = rivalPlayersForTeam(session.rivalPlayers, newTeamId).map((player) => ({
    ...player,
    club_id: newCareerId,
  }));

  const rivalPlayers = [
    ...session.rivalPlayers.filter((player) => player.club_id !== newCareerId),
    ...oldPros.map((player) => ({ ...player, club_id: careerTeamId(oldTeamId) })),
  ];

  const pools = session.league.league_pools ?? defaultLeaguePools();
  const league = leagueStateAfterMovement(
    { ...session.league, player_club_id: newTeamId },
    pools,
    newTeamId,
  );

  const resetPipeline = options?.resetPipeline !== false;

  if (!resetPipeline) {
    const youth = session.players
      .filter((player) => player.squad_status === "u17" || player.squad_status === "u19")
      .map((player) => ({ ...player, club_id: newCareerId }));
    return {
      ...session,
      clubId: newCareerId,
      league,
      players: [...youth, ...newPros],
      rivalPlayers,
      matchLineup: undefined,
    };
  }

  const youth = seedYouthSquad(newTeamId, {
    season: session.season,
    masterSeed: session.masterSeed,
    players: newPros,
  });

  let next: GameSession = {
    ...session,
    clubId: newCareerId,
    league,
    players: [...youth, ...newPros],
    rivalPlayers,
    matchLineup: undefined,
  };

  return resetClubPipelineForTeam(next, newTeamId);
}
