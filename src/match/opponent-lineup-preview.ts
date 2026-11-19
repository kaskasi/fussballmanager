import {
  awayKickoffPosition,
  getFormation,
  type FormationId,
  type FormationSlotId,
  type PitchPosition,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { squadForLeagueClub } from "../sim/league-divisions.ts";
import { indexRivalRoster, resolveCareerPlayer } from "../sim/rival-roster-match.ts";
import { matchCompetition, type CareerMatchSetup } from "../sim/career-match-setup.ts";
import { rivalPlayersForTeam } from "../sim/rival-engine-squad.ts";
import { estimateCa } from "../transfers/market-value.ts";
import {
  LEAGUE_COMPETITION,
  competitionDiscipline,
  isSuspended,
  type CompetitionId,
} from "../discipline/suspensions.ts";
import {
  lineupFormFromCareer,
  lineupFormFromEngineForm,
  engineFormToCareerForm,
} from "./lineup-player-status.ts";

export interface OpponentLineupEntry {
  slotId: FormationSlotId;
  playerId: string;
  name: string;
  shortName: string;
  ca: number;
  fitness: number;
  formDisplay: string;
  formTone: "good" | "mid" | "low";
  careerForm: number;
  position: PitchPosition;
}

export interface OpponentSuspension {
  playerId: string;
  name: string;
  /** League matches still to sit out, this one included. */
  matches: number;
}

export interface OpponentLineupPreview {
  teamShortName: string;
  formation: FormationId;
  starters: OpponentLineupEntry[];
  /** PRD 34 — banned opponents, best first. */
  suspended: OpponentSuspension[];
}

function pitchSide(isHome: boolean): "home" | "away" {
  return isHome ? "home" : "away";
}

function slotPosition(homePosition: PitchPosition, side: "home" | "away"): PitchPosition {
  return side === "home" ? homePosition : awayKickoffPosition(homePosition);
}

function shortDisplayName(name: string): string {
  const parts = name.split(" ");
  if (parts.length <= 1) return name.slice(0, 10);
  return parts[parts.length - 1] ?? name;
}

export function previewFromSquad(
  squad: Squad,
  teamShortName: string,
  opponentSide: "home" | "away",
  rivalRoster: readonly Player[] = [],
  competition: CompetitionId = LEAGUE_COMPETITION,
): OpponentLineupPreview {
  const formation = squad.tactics.formation;
  const slots = getFormation(formation);
  const rosterIndex = indexRivalRoster(rivalRoster);

  const starters = squad.starters.map((place) => {
    const slot = slots.find((entry) => entry.id === place.slot);
    const homePosition = slot?.homePosition ?? { x: 50, y: 50 };
    const rival = resolveCareerPlayer(place.player, rosterIndex);
    const ca = rival
      ? Math.round(estimateCa(rival.attributes, rival.position))
      : 0;
    const careerForm = rival
      ? rival.state.form
      : engineFormToCareerForm(place.player.form);
    const formInfo = rival
      ? lineupFormFromCareer(careerForm)
      : lineupFormFromEngineForm(place.player.form);
    const fitness = rival ? rival.state.fitness : 72;
    const name = rival ? formatPlayerName(rival) : place.player.name;
    const playerId = rival?.id ?? place.player.id;

    return {
      slotId: place.slot,
      playerId,
      name,
      shortName: shortDisplayName(name),
      ca,
      fitness,
      formDisplay: formInfo.label,
      formTone: formInfo.tone,
      careerForm,
      position: slotPosition(homePosition, opponentSide),
    };
  });

  const suspended = rivalRoster
    .filter((player) => isSuspended(player, competition))
    .sort(
      (left, right) =>
        estimateCa(right.attributes, right.position) - estimateCa(left.attributes, left.position),
    )
    .map((player) => ({
      playerId: player.id,
      name: formatPlayerName(player),
      matches: competitionDiscipline(player, competition).ban_matches,
    }));

  return {
    teamShortName,
    formation,
    starters,
    suspended,
  };
}

export function buildOpponentLineupPreview(
  setup: CareerMatchSetup,
  rivalPlayers: readonly Player[],
): OpponentLineupPreview | null {
  const opponentId: TeamId = setup.isHome ? setup.awayTeamId : setup.homeTeamId;
  const competition = matchCompetition(setup);
  const squad = squadForLeagueClub(opponentId, rivalPlayers, undefined, competition);
  if (!squad) return null;
  const roster = rivalPlayersForTeam(rivalPlayers, opponentId);
  return previewFromSquad(squad, setup.opponentShortName, pitchSide(!setup.isHome), roster, competition);
}
