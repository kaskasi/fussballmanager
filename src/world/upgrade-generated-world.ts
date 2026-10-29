import { asTeamId, type TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { defaultLeagueState, type LeagueState } from "../persistence/league-state.ts";
import type { SaveGame } from "../persistence/savegame-model.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import { engineTeamId } from "../sim/rival-growth.ts";
import {
  CLUBS_PER_DIVISION,
  GENERATED_CLUB_COUNT,
  generateWorld,
  persistedWorldState,
  WORLD_GENERATION_VERSION,
} from "./world-generator.ts";
import { DEFAULT_DIVISION_ID, divisionOfClub, emptyDivisionPools, PYRAMID } from "../sim/league-pyramid.ts";

export function worldNeedsExpansion(save: SaveGame): boolean {
  const world = save.state.world;
  const league = save.state.league ?? defaultLeagueState();
  const poolCount = (divisionId: DivisionEconomyId) =>
    league.league_pools?.[divisionId]?.length ??
    (divisionId === DEFAULT_DIVISION_ID ? league.club_ids.length : 0);

  return (
    world?.generation_version !== WORLD_GENERATION_VERSION ||
    (world?.clubs?.length ?? 0) < GENERATED_CLUB_COUNT ||
    PYRAMID.some((division) => poolCount(division.id) < division.clubCount) ||
    league.club_ids.length < CLUBS_PER_DIVISION
  );
}

export function expandGeneratedWorld(save: SaveGame): SaveGame {
  const masterSeed = save.rng_state.master_seed;
  const generated = generateWorld(masterSeed);
  const playerCareerClubId = save.manifest.player_club_id;
  const playerEngineId = engineTeamId(playerCareerClubId);
  const existingLeague = save.state.league ?? defaultLeagueState();

  const pools = emptyDivisionPools<TeamId>();
  for (const division of PYRAMID) {
    pools[division.id] = (generated.league_pools[division.id] ?? []).map(asTeamId);
  }
  const divisionId = divisionOfClub(pools, playerEngineId) ?? existingLeague.division_id;

  save.state.world = persistedWorldState(generated);
  save.state.league = {
    division_id: divisionId,
    player_club_id: playerEngineId,
    club_ids: [...pools[divisionId]],
    league_pools: pools,
    meetings_per_opponent: existingLeague.meetings_per_opponent,
    matchday: 1,
    results: [],
    player_stats: [],
    career_player_stats: [],
    season_complete: false,
  };

  const rivalPlayers = generated.players.filter(
    (player) => player.club_id !== playerCareerClubId,
  );
  const pipeline = save.state.pipeline;
  if (pipeline) {
    pipeline.rival_players = rivalPlayers;
    pipeline.scout_board = createScoutBoard(rivalPlayers);
    pipeline.match_lineup = undefined;
  }

  return save;
}
