import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { grantAchievement, ACHIEVEMENT } from "../player/achievements.ts";
import { loanClubName } from "./loan-roster.ts";
import type { WorldClub } from "../world/world-generator.ts";

function looksLikeRawClubToken(text: string): boolean {
  return text.includes("cl_world_") || /^cl_[a-z0-9_]+$/i.test(text.trim());
}

/** Fix legacy history lines that stored raw `cl_world_*` ids. */
export function formatClubEventMessage(
  message: string,
  worldClubs?: readonly WorldClub[],
): string {
  if (!message.includes("cl_world_")) {
    return message;
  }
  return message.replace(/\bcl_world_[a-z0-9_]+\b/gi, (token) =>
    loanClubName(token, worldClubs),
  );
}

/** Archive / hub feed — resolve club slugs and player ids in stored event text. */
export function polishClubEventMessage(
  message: string,
  players: readonly Player[],
  worldClubs?: readonly WorldClub[],
): string {
  let text = formatClubEventMessage(message, worldClubs);
  return text.replace(/\bpl_\d{5}\b/g, (playerId) => {
    const player = players.find((entry) => entry.id === playerId);
    return player ? formatPlayerName(player) : playerId;
  });
}

export function displayTransferOtherClubs(
  label: string,
  worldClubs?: readonly WorldClub[],
): string {
  if (!label.includes("→")) {
    return looksLikeRawClubToken(label) ? loanClubName(label.trim(), worldClubs) : label;
  }
  return label
    .split("→")
    .map((part) => {
      const token = part.trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
      return looksLikeRawClubToken(token) ? loanClubName(token, worldClubs) : part.trim();
    })
    .join(" → ");
}
import { contractUntilSeasonAfterTerm } from "./contract-until-season.ts";
import type { TransferState } from "./negotiations.ts";

export type TransferKind = "in" | "out" | "loan_out" | "loan_return" | "ai";

export interface TransferRecord {
  id: string;
  season: number;
  week: number;
  kind: TransferKind;
  player_id: string;
  player_name: string;
  other_club_id: string;
  other_club_name: string;
  fee?: number;
}

export const DEFAULT_LOAN_PARTNER_ID = "cl_loan_partner";

export function transferKindIcon(kind: TransferKind): string {
  switch (kind) {
    case "in":
      return "🟢";
    case "out":
      return "🔴";
    case "loan_out":
      return "🔄";
    case "loan_return":
      return "↩️";
    case "ai":
      return "💱";
    default:
      return "💰";
  }
}

export function transferKindLabel(kind: TransferKind): string {
  switch (kind) {
    case "in":
      return "Zugang";
    case "out":
      return "Abgang";
    case "loan_out":
      return "Verliehen";
    case "loan_return":
      return "Rückkehr";
    case "ai":
      return "Liga-Transfer";
    default:
      return "Transfer";
  }
}

export function appendTransferRecord(
  state: TransferState,
  record: Omit<TransferRecord, "id"> & { id?: string },
): TransferState {
  const entry: TransferRecord = {
    ...record,
    id: record.id ?? `tr_${record.season}_${record.week}_${record.kind}_${record.player_id}`,
  };
  return {
    ...state,
    history: [entry, ...state.history],
  };
}

export function recordsForSeason(history: readonly TransferRecord[], season: number): TransferRecord[] {
  return history.filter((record) => record.season === season);
}

export function isClubTransferRecord(record: TransferRecord): boolean {
  return record.kind !== "ai";
}

/** Manager-club moves only (no league AI ticker). */
export function clubRecordsForSeason(
  history: readonly TransferRecord[],
  season: number,
): TransferRecord[] {
  return history.filter((record) => record.season === season && isClubTransferRecord(record));
}

export function clubArrivalRecords(records: readonly TransferRecord[]): TransferRecord[] {
  return records.filter((record) => record.kind === "in" || record.kind === "loan_return");
}

export function clubDepartureRecords(records: readonly TransferRecord[]): TransferRecord[] {
  return records.filter((record) => record.kind === "out" || record.kind === "loan_out");
}

export function availableTransferSeasons(history: readonly TransferRecord[], currentSeason: number): number[] {
  const seasons = new Set<number>([currentSeason]);
  for (const record of history) seasons.add(record.season);
  return [...seasons].sort((left, right) => right - left);
}

/** Seasons with at least one manager-club move (excludes AI-only seasons). */
export function availableClubTransferSeasons(
  history: readonly TransferRecord[],
  currentSeason: number,
): number[] {
  const seasons = new Set<number>([currentSeason]);
  for (const record of history) {
    if (isClubTransferRecord(record)) seasons.add(record.season);
  }
  return [...seasons].sort((left, right) => right - left);
}

export function loanPlayerOut(
  player: Player,
  season: number,
  week: number,
  fromClubId: string,
  toClubId = DEFAULT_LOAN_PARTNER_ID,
  fee?: number,
): { player: Player; record: TransferRecord } {
  const loaned = grantAchievement(
    {
      ...player,
      squad_status: "loaned_out",
      current_loan: {
        from_club: fromClubId,
        to_club: toClubId,
        until_season: contractUntilSeasonAfterTerm(season, 1),
        has_option: true,
        minute_guarantee: 900,
      },
    },
    ACHIEVEMENT.loanMove,
  );
  const record: TransferRecord = {
    id: `tr_${season}_${week}_loan_out_${player.id}`,
    season,
    week,
    kind: "loan_out",
    player_id: player.id,
    player_name: formatPlayerName(player),
    other_club_id: toClubId,
    other_club_name: loanClubName(toClubId),
    fee,
  };
  return { player: loaned, record };
}

export function createAiTransferRecord(
  player: Player,
  fee: number,
  season: number,
  week: number,
  fromClubId: string,
  toClubId: string,
  worldClubs?: readonly WorldClub[],
): TransferRecord {
  return {
    id: `tr_${season}_${week}_ai_${player.id}`,
    season,
    week,
    kind: "ai",
    player_id: player.id,
    player_name: formatPlayerName(player),
    other_club_id: toClubId,
    other_club_name: `${loanClubName(fromClubId, worldClubs)} → ${loanClubName(toClubId, worldClubs)}`,
    fee,
  };
}

export function createSaleRecord(
  player: Player,
  fee: number,
  season: number,
  week: number,
  fromClubId: string,
  toClubId: string,
): TransferRecord {
  return {
    id: `tr_${season}_${week}_out_${player.id}`,
    season,
    week,
    kind: "out",
    player_id: player.id,
    player_name: formatPlayerName(player),
    other_club_id: toClubId,
    other_club_name: loanClubName(toClubId),
    fee,
  };
}

export function createPurchaseRecord(
  player: Player,
  fee: number,
  season: number,
  week: number,
  fromClubId: string,
  toClubId: string,
): TransferRecord {
  return {
    id: `tr_${season}_${week}_in_${player.id}`,
    season,
    week,
    kind: "in",
    player_id: player.id,
    player_name: formatPlayerName(player),
    other_club_id: fromClubId,
    other_club_name: loanClubName(fromClubId),
    fee,
  };
}

/** End-of-season loan returns — loans expire after the agreed season. */
export function processLoanReturns(
  players: readonly Player[],
  endingSeason: number,
  week: number,
): { players: Player[]; records: TransferRecord[] } {
  const records: TransferRecord[] = [];
  const nextPlayers = players.map((player) => {
    if (player.squad_status !== "loaned_out" || !player.current_loan) return player;
    if (player.current_loan.until_season > endingSeason + 1) return player;

    const restoredStatus: Player["squad_status"] =
      player.age >= 18 ? "pro" : player.age >= 16 ? "u19" : "u17";
    records.push({
      id: `tr_${endingSeason + 1}_${week}_loan_return_${player.id}`,
      season: endingSeason + 1,
      week,
      kind: "loan_return",
      player_id: player.id,
      player_name: formatPlayerName(player),
      other_club_id: player.current_loan.to_club,
      other_club_name: loanClubName(player.current_loan.to_club),
    });
    const { current_loan: _loan, ...rest } = player;
    return {
      ...rest,
      squad_status: restoredStatus,
    } satisfies Player;
  });
  return { players: nextPlayers, records };
}

export function loanReturnMessage(record: TransferRecord): string {
  return `${record.player_name} kehrt von ${record.other_club_name} zurück`;
}

export function loanOutMessage(record: TransferRecord): string {
  return `${record.player_name} verliehen an ${record.other_club_name}`;
}
