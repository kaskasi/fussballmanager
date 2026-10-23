import { NORDSTERN_ID, squadAverageStrength, type TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { defaultLeagueState, type LeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools, divisionLabel, squadForLeagueClub } from "../sim/league-divisions.ts";
import { divisionForClub } from "../sim/club-profiles.ts";
import { clubShortName } from "../sim/league-week.ts";
import { generateSeasonObjectives } from "./season-objectives.ts";
import type { Player } from "../types/player.ts";

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

export interface ListJobOffersOptions {
  /** Offer from this division instead of the manager's current one (Story Mode Act 2). */
  divisionId?: DivisionEconomyId;
  excludeTeamIds?: readonly TeamId[];
  /** Live rival squads for strength ranking; falls back to template squads. */
  rivalPlayers?: readonly Player[];
}

export function listJobOffers(
  dismissedFromClubId: TeamId,
  season: number,
  league: Pick<LeagueState, "league_pools" | "player_club_id">,
  options: ListJobOffersOptions = {},
): JobOffer[] {
  const pools = league.league_pools;
  if (!pools) return [];

  const anchorClubId = league.player_club_id ?? dismissedFromClubId;
  const divisionId = options.divisionId ?? divisionForClub(pools, anchorClubId);
  const excluded = new Set<TeamId>([dismissedFromClubId, ...(options.excludeTeamIds ?? [])]);
  const divisionClubs = pools[divisionId] ?? [];
  const offers = divisionClubs
    .filter((clubId) => !excluded.has(clubId))
    .map((clubId) => {
      const squad = squadForLeagueClub(clubId, options.rivalPlayers);
      return {
        clubId,
        strength: squad ? squadAverageStrength(squad) : 48,
      };
    })
    .sort((left, right) => left.strength - right.strength || left.clubId.localeCompare(right.clubId))
    .slice(0, 3);

  return offers.map(({ clubId }) => jobOfferForTeam(clubId, season, league));
}

/** One offer card for a club — also used to render frozen Story Mode offers. */
export function jobOfferForTeam(
  clubId: TeamId,
  season: number,
  league: Pick<LeagueState, "league_pools" | "player_club_id">,
): JobOffer {
  const pools = league.league_pools ?? defaultLeaguePools();
  const divisionId = divisionForClub(pools, clubId);
  const leagueContext: LeagueState = { ...defaultLeagueState(), ...league };
  const objectives = generateSeasonObjectives(clubId, season, leagueContext, { avg_ca: 70 });
  const primary = objectives.find((entry) => entry.mandatory) ?? objectives[0];
  return {
    clubId,
    clubName: clubShortName(clubId),
    shortName: clubShortName(clubId),
    signingBonus: SIGNING_BONUS,
    objectivePreview: primary?.label ?? "Saisonziele nach Vereinsgröße",
    divisionId,
    divisionLabel: divisionLabel(divisionId),
  };
}

export function defaultEmployerClubId(): TeamId {
  return NORDSTERN_ID;
}
