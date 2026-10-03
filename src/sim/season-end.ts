import { appendSeasonSnapshot } from "../ui/player-profile.ts";
import type { Player } from "../types/player.ts";
import { resetSeasonMinutes } from "../player/minute-history.ts";
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";
import { resetAiBudgetsForSeason } from "../transfers/ai-transfer-market.ts";
import { careerTeamId } from "./rival-growth.ts";
import { seasonCalendarYear } from "./season-label.ts";
import {
  appendTransferRecord,
  processLoanReturns,
  type TransferRecord,
} from "../transfers/transfer-history.ts";
import { normalizeLeagueState, resetLeagueSeason } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "./league-divisions.ts";
import {
  applyPromotionRelegation,
  leagueStateAfterMovement,
  type PromotionRelegationResult,
} from "./promotion-relegation.ts";
import { ageRivalPlayers } from "./rival-growth.ts";
import { SEASON_END_WEEK } from "../sim/game-calendar.ts";
import {
  generateYouthIntake,
  type AcademyFacility,
} from "../youth/intake-generator.ts";
import { evaluateSeasonObjectives, startBoardSeason } from "../board/season-objectives.ts";
import { applySeasonEndFinances } from "../economy/club-finances.ts";
import type { SeasonObjectiveEvaluation } from "../board/board-state.ts";
import { expireSponsorDeals } from "../stadium/sponsor-deals.ts";
import { advanceClubFanbase, seasonEndFanbaseBonus } from "../stadium/fanbase.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { activatePendingPreContracts } from "../transfers/pre-contracts.ts";
import { computeSeasonAwards } from "./season-awards.ts";
import { appendSeasonCoda } from "../narrative/season-end-narrative.ts";

export interface SeasonEndResult {
  session: GameSession;
  intakeCount: number;
  loanReturns: TransferRecord[];
  boardEvaluation?: SeasonObjectiveEvaluation;
  promotionRelegation?: PromotionRelegationResult;
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
  const preContractStep = activatePendingPreContracts(
    afterReturns,
    session.rivalPlayers,
    session.transferState,
    endingSeason,
    SEASON_END_WEEK,
    session.clubId,
  );

  const idStart = nextIntakeIdStart(preContractStep.players);
  const intake = generateYouthIntake({
    season: session.season,
    week: SEASON_END_WEEK,
    seasonYear: seasonCalendarYear(session.season),
    clubId: session.clubId,
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility,
    idStart,
    random: mulberry32(session.masterSeed ^ endingSeason),
  });

  const players = refreshAllMarketValues([...preContractStep.players, ...intake], session.season);
  const financesAfterPrizes = applySeasonEndFinances(
    session.finances,
    session.league,
    endingSeason,
    SEASON_END_WEEK,
    session.stadium,
  );
  const boardStep = evaluateSeasonObjectives(
    session.board,
    session.league,
    financesAfterPrizes,
    endingSeason,
  );
  let finances = boardStep.finances;
  let board = boardStep.board;
  if (!boardStep.evaluation.dismissed) {
    board = startBoardSeason(board, board.employer_club_id, session.season);
  }
  let transferState = preContractStep.transferState;
  for (const record of loanReturns) {
    transferState = appendTransferRecord(transferState, record);
  }
  const leagueNormalizedForBudgets = normalizeLeagueState(session.league);
  const budgetClubIds = leagueNormalizedForBudgets.club_ids.map((teamId) => careerTeamId(teamId));
  transferState = {
    ...transferState,
    ai_budgets: resetAiBudgetsForSeason(budgetClubIds, leagueNormalizedForBudgets.division_id),
  };
  const stadiumAdvanced = advanceClubFanbase(session.stadium, seasonEndFanbaseBonus(session.league));
  const stadium = {
    ...stadiumAdvanced,
    sponsor_deals: expireSponsorDeals(stadiumAdvanced.sponsor_deals, session.season),
  };
  const leagueNormalized = normalizeLeagueState(session.league);
  const lastSeasonAwards = computeSeasonAwards(
    leagueNormalized,
    preContractStep.players,
    preContractStep.rivalPlayers,
    endingSeason,
  );
  const pools = leagueNormalized.league_pools ?? defaultLeaguePools();
  const promotionRelegation = applyPromotionRelegation(
    leagueNormalized,
    pools,
    session.masterSeed,
    endingSeason,
    session.rivalPlayers,
  );
  const leagueAfterMovement = leagueStateAfterMovement(
    leagueNormalized,
    promotionRelegation.pools,
    leagueNormalized.player_club_id,
  );
  const storyState = appendSeasonCoda(
    session.storyState,
    session.league,
    endingSeason,
    SEASON_END_WEEK,
  );

  return {
    session: {
      ...session,
      players,
      finances,
      transferState,
      stadium,
      board,
      rivalPlayers: ageRivalPlayers(preContractStep.rivalPlayers),
      lastSeasonAwards,
      league: resetLeagueSeason(leagueAfterMovement),
      storyState,
    },
    intakeCount: intake.length,
    loanReturns,
    boardEvaluation: boardStep.evaluation,
    promotionRelegation,
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
