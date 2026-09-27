import type { TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { leagueStateAfterMovement } from "../sim/promotion-relegation.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { rivalPlayersForTeam } from "../sim/rival-engine-squad.ts";

/** Move the manager to a new club: league id, squad, and rival pool. */
export function switchManagerClub(session: GameSession, newTeamId: TeamId): GameSession {
  const oldTeamId = session.league.player_club_id;
  const oldCareerId = session.clubId;
  const newCareerId = careerTeamId(newTeamId);

  if (newTeamId === oldTeamId) return session;

  const youth = session.players
    .filter((player) => player.squad_status === "u17" || player.squad_status === "u19")
    .map((player) => ({ ...player, club_id: newCareerId }));

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

  return {
    ...session,
    clubId: newCareerId,
    league,
    players: [...youth, ...newPros],
    rivalPlayers,
    matchLineup: undefined,
  };
}
