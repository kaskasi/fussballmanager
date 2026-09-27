import { NORDSTERN_ID, SEED_DIVISION, type TeamId } from "@fussballmanager/shared";
import { clubShortName } from "../sim/league-week.ts";
import { generateSeasonObjectives } from "./season-objectives.ts";

export interface JobOffer {
  clubId: TeamId;
  clubName: string;
  shortName: string;
  signingBonus: number;
  objectivePreview: string;
}

const SIGNING_BONUS = 120_000;

export function listJobOffers(currentClubId: TeamId, season: number): JobOffer[] {
  const rivals = SEED_DIVISION
    .map((squad) => squad.team.id)
    .filter((clubId) => clubId !== currentClubId)
    .slice(0, 3);

  const fallback = SEED_DIVISION.map((squad) => squad.team.id).filter((id) => id !== currentClubId);
  const offers = (rivals.length > 0 ? rivals : fallback).slice(0, 3);

  return offers.map((clubId) => {
    const objectives = generateSeasonObjectives(clubId, season);
    const primary = objectives.find((entry) => entry.id === "league_place");
    return {
      clubId,
      clubName: clubShortName(clubId),
      shortName: clubShortName(clubId),
      signingBonus: SIGNING_BONUS,
      objectivePreview: primary?.label ?? "Saisonziele nach Vereinsgröße",
    };
  });
}

export function defaultEmployerClubId(): TeamId {
  return NORDSTERN_ID;
}
