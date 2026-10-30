import { NORDSTERN_ID, squadAverageStrength, type TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { defaultLeagueState, totalSeasonMatchdays, type LeagueState } from "../persistence/league-state.ts";
import { divisionAbove } from "../sim/league-pyramid.ts";
import { tablePlaceForClub } from "./club-standing-tier.ts";
import {
  clubDisplayName,
  defaultLeaguePools,
  divisionLabel,
  squadForLeagueClub,
} from "../sim/league-divisions.ts";
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

/** A top-four place after this many matchdays gets offers from the division above (PRD 32 §8). */
export const JOB_OFFER_SUCCESS_PLACE = 4;
export const JOB_OFFER_SUCCESS_MIN_MATCHDAYS = 10;

/** The weakest `count` clubs of a division: the ones that hire a manager from below. */
function weakestClubs(
  clubIds: readonly TeamId[],
  excluded: ReadonlySet<TeamId>,
  count: number,
  rivalPlayers?: readonly Player[],
): TeamId[] {
  return clubIds
    .filter((clubId) => !excluded.has(clubId))
    .map((clubId) => {
      const squad = squadForLeagueClub(clubId, rivalPlayers);
      return { clubId, strength: squad ? squadAverageStrength(squad) : 48 };
    })
    .sort((left, right) => left.strength - right.strength || left.clubId.localeCompare(right.clubId))
    .slice(0, count)
    .map(({ clubId }) => clubId);
}

/** Did the manager's club play a strong season so far (PRD 32 §8)? */
function successfulSeason(league: Partial<LeagueState>, clubId: TeamId): boolean {
  if (!league.results?.length || !league.club_ids?.length) return false;
  const full: LeagueState = { ...defaultLeagueState(), ...league } as LeagueState;
  const played = full.season_complete ? totalSeasonMatchdays(full) : full.matchday - 1;
  return played >= JOB_OFFER_SUCCESS_MIN_MATCHDAYS && tablePlaceForClub(full, clubId) <= JOB_OFFER_SUCCESS_PLACE;
}

export function listJobOffers(
  dismissedFromClubId: TeamId,
  season: number,
  league: Pick<LeagueState, "league_pools" | "player_club_id"> & Partial<LeagueState>,
  options: ListJobOffersOptions = {},
): JobOffer[] {
  const pools = league.league_pools;
  if (!pools) return [];

  const anchorClubId = league.player_club_id ?? dismissedFromClubId;
  const divisionId = options.divisionId ?? divisionForClub(pools, anchorClubId);
  const excluded = new Set<TeamId>([dismissedFromClubId, ...(options.excludeTeamIds ?? [])]);
  // After a strong season two of the three offers come from the division above.
  const above = options.divisionId ? undefined : divisionAbove(divisionId);
  const upward =
    above && successfulSeason(league, anchorClubId)
      ? weakestClubs(pools[above] ?? [], excluded, 2, options.rivalPlayers)
      : [];
  const offers = [
    ...upward,
    ...weakestClubs(pools[divisionId] ?? [], excluded, 3 - upward.length, options.rivalPlayers),
  ];

  return offers.map((clubId) => jobOfferForTeam(clubId, season, league));
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
    clubName: clubDisplayName(clubId),
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
