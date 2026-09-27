import { NORDSTERN_ID, squadAverageStrength, type TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools, divisionLabel, squadForLeagueClub } from "../sim/league-divisions.ts";
import { divisionForClub } from "../sim/club-profiles.ts";
import { clubShortName } from "../sim/league-week.ts";
import { generateSeasonObjectives } from "./season-objectives.ts";

export interface JobOffer {
  clubId: TeamId;
  clubName: string;
  shortName: string;
  signingBonus: number;
  objectivePreview: string;
  divisionId: DivisionEconomyId;
  divisionLabel: string;
}

const SIGNING_BONUS = 120_000;

export function listJobOffers(
  dismissedFromClubId: TeamId,
  season: number,
  league: Pick<LeagueState, "league_pools" | "player_club_id">,
): JobOffer[] {
  const pools = league.league_pools;
  if (!pools) return [];

  const anchorClubId = league.player_club_id ?? dismissedFromClubId;
  const divisionId = divisionForClub(pools, anchorClubId);
  const divisionClubs = pools[divisionId] ?? [];
  const offers = divisionClubs
    .filter((clubId) => clubId !== dismissedFromClubId)
    .map((clubId) => {
      const squad = squadForLeagueClub(clubId);
      return {
        clubId,
        strength: squad ? squadAverageStrength(squad) : 48,
      };
    })
    .sort((left, right) => left.strength - right.strength)
    .slice(0, 3);

  return offers.map(({ clubId }) => {
    const objectives = generateSeasonObjectives(clubId, season);
    const primary = objectives.find((entry) => entry.id === "league_place");
    return {
      clubId,
      clubName: clubShortName(clubId),
      shortName: clubShortName(clubId),
      signingBonus: SIGNING_BONUS,
      objectivePreview: primary?.label ?? "Saisonziele nach Vereinsgröße",
      divisionId,
      divisionLabel: divisionLabel(divisionId),
    };
  });
}

export function defaultEmployerClubId(): TeamId {
  return NORDSTERN_ID;
}
