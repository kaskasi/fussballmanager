import type { Squad } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { squadForLeagueClub } from "../sim/league-divisions.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import {
  buildSquadFromAssignments,
  normalizeMatchLineup,
  type MatchLineupState,
} from "./lineup-board.ts";
import { loadTacticsPreset, type TacticsPresetSlot } from "./tactics-presets.ts";

export type CareerMatchSquads = {
  homeSquad: Squad;
  awaySquad: Squad;
  playerClubSquad: Squad;
};

/** Same squad resolution as career match / lineup screen. */
export function resolveCareerMatchSquads(input: {
  setup: CareerMatchSetup;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  matchLineup?: MatchLineupState;
  tacticsPresets: readonly TacticsPresetSlot[];
}): CareerMatchSquads | null {
  const managerClubId = careerTeamId(input.setup.playerClubId);
  const fallbackPlan = loadTacticsPreset(input.tacticsPresets, 1);
  const normalized = normalizeMatchLineup(
    input.matchLineup,
    input.players,
    fallbackPlan,
    managerClubId,
  );
  const playerClubSquad = buildSquadFromAssignments(
    input.players,
    normalized.plan,
    normalized.assignments,
    input.setup.playerClubId,
    managerClubId,
  );
  if (!playerClubSquad) return null;

  const opponentId =
    input.setup.homeTeamId === input.setup.playerClubId
      ? input.setup.awayTeamId
      : input.setup.homeTeamId;
  const opponentSquad = squadForLeagueClub(opponentId, input.rivalPlayers);
  if (!opponentSquad) return null;

  const homeSquad =
    input.setup.homeTeamId === input.setup.playerClubId ? playerClubSquad : opponentSquad;
  const awaySquad =
    input.setup.awayTeamId === input.setup.playerClubId ? playerClubSquad : opponentSquad;

  return { homeSquad, awaySquad, playerClubSquad };
}
