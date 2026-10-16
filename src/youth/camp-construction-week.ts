import type { Player } from "../types/player.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import type { AcademyFacility } from "./intake-generator.ts";
import {
  campNationById,
  generateCampOpeningBundle,
  type YouthCamp,
} from "./satellite-camps.ts";

export type CampWeekDebut = { campId: string; playerId: string };

export type CampConstructionCompletion = { campId: string; nationLabel: string; flag: string };

export function advanceYouthCampsForWeek(input: {
  camps: readonly YouthCamp[];
  season: number;
  week: number;
  clubId: string;
  masterSeed: number;
  players: readonly Player[];
  facility: AcademyFacility;
}): {
  camps: YouthCamp[];
  newPlayers: Player[];
  debuts: CampWeekDebut[];
  constructionCompletions: CampConstructionCompletion[];
} {
  const newPlayers: Player[] = [];
  const debuts: CampWeekDebut[] = [];
  const constructionCompletions: CampConstructionCompletion[] = [];
  const now = careerWeekIndex(input.season, input.week);
  let playerPool = input.players;

  const camps = input.camps.map((camp) => {
    const until = camp.construction_until;
    const openingDone = camp.opening_players_delivered ?? until == null;

    if (until != null && now > until) {
      const nation = campNationById(camp.id);
      if (nation) {
        constructionCompletions.push({
          campId: camp.id,
          nationLabel: nation.label,
          flag: nation.flag,
        });
      }
    }

    if (until != null && now > until && !openingDone) {
      const opening = generateCampOpeningBundle({
        campId: camp.id,
        clubId: input.clubId,
        season: input.season,
        week: input.week,
        masterSeed: input.masterSeed,
        players: playerPool,
        facility: input.facility,
      });
      if (opening.players.length > 0) {
        newPlayers.push(...opening.players);
        playerPool = [...playerPool, ...opening.players];
        if (opening.headlinePlayerId) {
          debuts.push({ campId: camp.id, playerId: opening.headlinePlayerId });
        }
      }
      const { construction_until: _removed, ...rest } = camp;
      return { ...rest, opening_players_delivered: true };
    }

    if (until != null && now > until) {
      const { construction_until: _removed, ...rest } = camp;
      return { ...rest, opening_players_delivered: camp.opening_players_delivered ?? true };
    }

    return camp;
  });

  return { camps, newPlayers, debuts, constructionCompletions };
}
