import type { TeamId } from "@fussballmanager/shared";
import { clubShortLabel } from "../sim/league-divisions.ts";
import { engineTeamId } from "../sim/rival-growth.ts";
import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../types/player-display.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { estimateCa } from "./market-value.ts";

const CAREER_CLUB_NAMES: Record<string, string> = {
  cl_fc_nordstern: "Kieler FC",
  cl_loan_partner: "TSV Heideweg",
  cl_rival_pool: "Vereinspool",
};

export interface LoanRow {
  playerId: string;
  displayName: string;
  position: PositionPrimary;
  positionLabel: string;
  age: number;
  ca: number;
  toClubId: string;
  toClubName: string;
  untilSeason: number;
  hasOption: boolean;
  minuteGuarantee?: number;
}

function teamIdFromClubId(clubId: string): TeamId {
  if (clubId.startsWith("cl_")) {
    return engineTeamId(clubId);
  }
  return clubId as TeamId;
}

/** Human-readable club label (`cl_world_*` → short name from world save). */
export function loanClubName(
  clubId: string,
  worldClubs?: readonly WorldClub[],
): string {
  if (CAREER_CLUB_NAMES[clubId]) {
    return CAREER_CLUB_NAMES[clubId];
  }
  const teamId = teamIdFromClubId(clubId);
  const label = clubShortLabel(teamId, worldClubs);
  if (label !== teamId && !label.startsWith("cl_")) {
    return label;
  }
  return clubId.replace(/^cl_/, "").replace(/_/g, " ");
}

export function listLoanedPlayers(
  players: readonly Player[],
  worldClubs?: readonly WorldClub[],
): LoanRow[] {
  return players
    .filter((player) => player.squad_status === "loaned_out" && player.current_loan)
    .map((player) => {
      const loan = player.current_loan!;
      return {
        playerId: player.id,
        displayName: formatPlayerName(player),
        position: player.position,
        positionLabel: formatPlayerPositionLabel(player),
        age: player.age,
        ca: Math.round(estimateCa(player.attributes, player.position)),
        toClubId: loan.to_club,
        toClubName: loanClubName(loan.to_club, worldClubs),
        untilSeason: loan.until_season,
        hasOption: loan.has_option,
        minuteGuarantee: loan.minute_guarantee,
      };
    })
    .sort((left, right) => right.ca - left.ca);
}
