import { clubShortName } from "../sim/league-week.ts";
import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { estimateCa } from "./market-value.ts";

const CAREER_CLUB_NAMES: Record<string, string> = {
  cl_fc_nordstern: "FC Nordstern",
  cl_loan_partner: "TSV Heideweg",
  cl_rival_pool: "Vereinspool",
};

export interface LoanRow {
  playerId: string;
  displayName: string;
  position: PositionPrimary;
  age: number;
  ca: number;
  toClubId: string;
  toClubName: string;
  untilSeason: number;
  hasOption: boolean;
  minuteGuarantee?: number;
}

export function loanClubName(clubId: string): string {
  return CAREER_CLUB_NAMES[clubId] ?? clubShortName(clubId as never) ?? clubId.replace(/^cl_/, "").replace(/_/g, " ");
}

export function listLoanedPlayers(players: readonly Player[]): LoanRow[] {
  return players
    .filter((player) => player.squad_status === "loaned_out" && player.current_loan)
    .map((player) => {
      const loan = player.current_loan!;
      return {
        playerId: player.id,
        displayName: formatPlayerName(player),
        position: player.position,
        age: player.age,
        ca: Math.round(estimateCa(player.attributes, player.position)),
        toClubId: loan.to_club,
        toClubName: loanClubName(loan.to_club),
        untilSeason: loan.until_season,
        hasOption: loan.has_option,
        minuteGuarantee: loan.minute_guarantee,
      };
    })
    .sort((left, right) => right.ca - left.ca);
}
