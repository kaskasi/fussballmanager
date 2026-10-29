/**
 * Fixed clubs and named players in the procedural world (easter eggs / flavor).
 */
import { asTeamId, type TeamId } from "@fussballmanager/shared";
import { seedPhaseStamps } from "../development/ability-stamps.ts";
import { estimateCa, marketValue } from "../transfers/market-value.ts";
import type { Attributes, Player } from "../types/player.ts";
import { deriveClubKitColors } from "./club-kit.ts";
import type { WorldClub } from "./world-generator.ts";
import { deriveWorldSeed, worldCareerClubId } from "./world-generator.ts";
import { bottomDivisionId } from "../sim/league-pyramid.ts";

export const UNION_RENDSBURG_TEAM_ID: TeamId = asTeamId("union-rendsburg");

/** First Oberliga slot — always Union Rendsburg (Fördeküste). */
export function unionRendsburgClub(masterSeed: number, clubIndex: number): WorldClub {
  return {
    id: UNION_RENDSBURG_TEAM_ID,
    name: "Union Rendsburg",
    short_name: "URD",
    place: "Rendsburg",
    region: "Fördeküste",
    division_id: bottomDivisionId(),
    identity: "traditional",
    reputation: 38,
    rivalry_ids: [],
    kit: deriveClubKitColors(masterSeed, UNION_RENDSBURG_TEAM_ID, clubIndex),
  };
}

export function applyClubCameoPlayers(
  roster: readonly Player[],
  club: WorldClub,
  masterSeed: number,
  clubIndex: number,
): Player[] {
  if (club.id !== UNION_RENDSBURG_TEAM_ID) return [...roster];
  const cmSlot = roster.findIndex((player) => player.position === "CM");
  if (cmSlot < 0) return [...roster];
  const template = roster[cmSlot]!;
  const axel = buildAxelJaiser(template, club, masterSeed, clubIndex);
  return roster.map((player, index) => (index === cmSlot ? axel : player));
}

function buildAxelJaiser(
  template: Player,
  club: WorldClub,
  masterSeed: number,
  clubIndex: number,
): Player {
  const attributes: Attributes = {
    shooting: 70,
    passing: 88,
    dribbling: 81,
    technique: 86,
    pace: 76,
    strength: 74,
    stamina: 84,
    composure: 82,
    leadership: 72,
    positioning: 80,
    vision: 87,
    concentration: 78,
    teamwork: 85,
    weak_foot: 58,
    gk_handling: 10,
  };
  const ca = estimateCa(attributes, "CM");
  const age = 27;
  const wage = Math.max(250, Math.round((350 + Math.pow(Math.max(30, ca) / 60, 3.1) * 700) / 25) * 25);
  const untilSeason = template.contract?.until_season ?? 4;
  const value = marketValue({
    ca,
    age,
    monthsRemaining: (untilSeason - 1) * 12,
    wage,
    marketWage: wage,
    demandFactor: 1,
    reputationFactor: 1,
  });
  const portraitSeed = deriveWorldSeed(masterSeed, "portrait-cameo", clubIndex);

  const player: Player = {
    ...template,
    id: template.id,
    name: { first: "Axel", last: "Jaiser" },
    birth: { date: "1999-03-14", place: "Rendsburg", region: club.region },
    age,
    club_id: worldCareerClubId(club.id),
    position: "CM",
    flexibility: [{ trained_as: "AM", proficiency: 0.62, weeks_trained: 0 }],
    contract: {
      wage_weekly: wage,
      bonus_goal: Math.round(wage * 0.08),
      bonus_appearance: Math.round(wage * 0.12),
      until_season: untilSeason,
      guaranteed_minutes_promise: "starter",
    },
    market_value: value,
    attributes,
    hidden: {
      ...template.hidden,
      drive: 1.15,
      anlage: {
        ...template.hidden.anlage,
        passing: 1.35,
        vision: 1.32,
        technique: 1.28,
        stamina: 1.2,
      },
    },
    state: {
      ...template.state,
      morale: 68,
      fitness: 94,
    },
    portrait_seed: portraitSeed,
  };

  return seedPhaseStamps(player, 1, 1);
}
