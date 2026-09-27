import { appendSeasonSnapshot } from "../ui/player-profile.ts";
import type { Player } from "../types/player.ts";
import { resetSeasonMinutes } from "../player/minute-history.ts";
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";
import {
  appendTransferRecord,
  processLoanReturns,
  type TransferRecord,
} from "../transfers/transfer-history.ts";
import { resetLeagueSeason } from "../persistence/league-state.ts";
import { SEASON_END_WEEK } from "../sim/game-calendar.ts";
import {
  generateYouthIntake,
  type AcademyFacility,
} from "../youth/intake-generator.ts";
import { applySeasonEndFinances } from "../economy/club-finances.ts";
import type { GameSession } from "../persistence/game-session.ts";

export interface SeasonEndResult {
  session: GameSession;
  intakeCount: number;
  loanReturns: TransferRecord[];
}

function nextIntakeIdStart(players: readonly Player[]): number {
  let max = 0;
  for (const player of players) {
    const match = /^pl_(\d+)$/.exec(player.id);
    if (!match) continue;
    max = Math.max(max, Number.parseInt(match[1]!, 10));
  }
  return max + 1;
}

/** PRD 03.1 — intake, aging, growth snapshots at league season end. */
export function runSeasonEnd(
  session: GameSession,
  endingSeason: number,
  facility: AcademyFacility = "academy_basic",
): SeasonEndResult {
  const snapshotted = session.players.map((player) => appendSeasonSnapshot(player, endingSeason));
  const aged = snapshotted.map((player) => ({
    ...resetSeasonMinutes(player),
    age: player.age + 1,
  }));
  const { players: afterReturns, records: loanReturns } = processLoanReturns(
    aged,
    endingSeason,
    SEASON_END_WEEK,
  );

  const idStart = nextIntakeIdStart(afterReturns);
  const intake = generateYouthIntake({
    season: session.season,
    week: SEASON_END_WEEK,
    seasonYear: 2025 + session.season,
    clubId: session.clubId,
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility,
    idStart,
    random: mulberry32(session.masterSeed ^ endingSeason),
  });

  const players = refreshAllMarketValues([...afterReturns, ...intake], session.season);
  const finances = applySeasonEndFinances(
    session.finances,
    session.league,
    endingSeason,
    SEASON_END_WEEK,
  );
  let transferState = session.transferState;
  for (const record of loanReturns) {
    transferState = appendTransferRecord(transferState, record);
  }
  return {
    session: {
      ...session,
      players,
      finances,
      transferState,
      league: resetLeagueSeason(session.league),
    },
    intakeCount: intake.length,
    loanReturns,
  };
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
