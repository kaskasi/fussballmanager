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
import {
  campIntakeCountForCamp,
  campMixtureShift,
  campNationById,
  generateCampPlayerName,
  type YouthCamp,
} from "../youth/satellite-camps.ts";
import { isCampOperational } from "../youth/camp-construction.ts";
import { evaluateSeasonObjectives, startBoardSeason } from "../board/season-objectives.ts";
import { weeklyWageBill } from "../economy/club-finances.ts";
import { applySeasonEndFinances } from "../economy/club-finances.ts";
import type { SeasonObjectiveEvaluation } from "../board/board-state.ts";
import { expireSponsorDeals } from "../stadium/sponsor-deals.ts";
import { advanceClubFanbase, seasonEndFanbaseBonus } from "../stadium/fanbase.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { activatePendingPreContracts } from "../transfers/pre-contracts.ts";
import { computeSeasonAwards } from "./season-awards.ts";
import { appendSeasonCoda } from "../narrative/season-end-narrative.ts";
import { withPeakCa } from "../development/retirement.ts";
import { appendSeasonLine } from "../development/retired-players.ts";
import { assignFreePlayerIds, nextNumericIdHint } from "../player/player-ids.ts";
import { upkeepAiRosters } from "./ai-roster-upkeep.ts";
import {
  clubDivisionLookup,
  playersInAgreedDeals,
  pruneRetiredFromTransferState,
  retireAiPlayers,
} from "./world-retirement.ts";
import {
  careerActBoardObjectives,
  guardSeasonEndEvaluation,
  resolveCareerActSeasonEnd,
} from "../narrative/career-acts.ts";

export interface SeasonEndResult {
  session: GameSession;
  intakeCount: number;
  /** PRD 31 — players who retired this season end. */
  retiredCount: number;
  /** PRD 31 — AI youth and refill players added this season end. */
  aiYouthCount: number;
  aiRefillCount: number;
  loanReturns: TransferRecord[];
  boardEvaluation?: SeasonObjectiveEvaluation;
  promotionRelegation?: PromotionRelegationResult;
}

/** PRD 03.1 — intake, aging, growth snapshots at league season end. */
export function runSeasonEnd(
  session: GameSession,
  endingSeason: number,
  facility: AcademyFacility = session.academyFacility ?? "academy_basic",
): SeasonEndResult {
  // PRD 31 — season line and peak CA first, while club and season stats are still the ending season's.
  const divisionOf = clubDivisionLookup(normalizeLeagueState(session.league));
  const careerLine = (player: Player) => withPeakCa(appendSeasonLine(player, endingSeason, divisionOf));
  const rivalsWithLines = session.rivalPlayers.map(careerLine);
  const snapshotted = session.players.map((player) =>
    appendSeasonSnapshot(careerLine(player), endingSeason),
  );
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
    rivalsWithLines,
    session.transferState,
    endingSeason,
    SEASON_END_WEEK,
    session.clubId,
  );

  // PRD 31 — intake ids skip every id in play or retired (AI ids share the five-digit space).
  const idStart = nextNumericIdHint(preContractStep.players);
  const usedIds = new Set([
    ...preContractStep.players.map((player) => player.id),
    ...preContractStep.rivalPlayers.map((player) => player.id),
    ...(session.retiredPlayers ?? []).map((entry) => entry.id),
  ]);
  const intakeRaw = generateYouthIntake({
    season: session.season,
    week: SEASON_END_WEEK,
    seasonYear: seasonCalendarYear(session.season),
    clubId: session.clubId,
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility,
    idStart: 0,
    random: mulberry32(session.masterSeed ^ endingSeason),
  });
  const intake = assignFreePlayerIds(intakeRaw, usedIds, idStart);
  const campIntakeRaw = generateCampIntakes(
    session.youthCamps ?? [],
    session.clubId,
    session.season,
    endingSeason,
    session.masterSeed,
    idStart + intake.length,
    facility,
  );
  const campIntake = assignFreePlayerIds(campIntakeRaw, usedIds, idStart + intake.length);
  const players = refreshAllMarketValues(
    [...preContractStep.players, ...intake, ...campIntake],
    session.season,
  );
  const financesAfterPrizes = applySeasonEndFinances(
    session.finances,
    session.league,
    endingSeason,
    SEASON_END_WEEK,
    session.stadium,
  );
  const boardCtx = {
    players: session.players,
    clubId: session.clubId,
    stadium: session.stadium,
    youthCamps: session.youthCamps,
    weeklyWageBill: weeklyWageBill(session.players, session.clubId),
  };
  const boardStep = guardSeasonEndEvaluation(
    evaluateSeasonObjectives(
      session.board,
      session.league,
      financesAfterPrizes,
      endingSeason,
      boardCtx,
    ),
    session.storyState,
  );
  let finances = boardStep.finances;
  let board = boardStep.board;
  if (!boardStep.evaluation.dismissed) {
    board = startBoardSeason(
      board,
      board.employer_club_id,
      session.season,
      session.league,
      session,
    );
  }
  const aiRetirement = retireAiPlayers(
    preContractStep.rivalPlayers,
    { endingSeason, masterSeed: session.masterSeed },
    playersInAgreedDeals(preContractStep.transferState),
  );
  let transferState = pruneRetiredFromTransferState(
    preContractStep.transferState,
    new Set(aiRetirement.retired.map((entry) => entry.id)),
  );
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
  // Recruit for the division each club plays in next season.
  const aiUpkeep = upkeepAiRosters({
    rivalPlayers: aiRetirement.rivalPlayers,
    clubs: session.world.clubs,
    playerClubId: session.clubId,
    endingSeason,
    masterSeed: session.masterSeed,
    divisionOf: clubDivisionLookup(leagueAfterMovement),
  });
  const storyState =
    resolveCareerActSeasonEnd({
      story: session.storyState,
      league: leagueNormalized,
      promotionRelegation,
      players: session.players,
      rivalPlayers: session.rivalPlayers,
      careerClubId: session.clubId,
      endingSeason,
      nextSeason: session.season,
      week: SEASON_END_WEEK,
    }) ?? appendSeasonCoda(session.storyState, session.league, endingSeason, SEASON_END_WEEK);
  if (!boardStep.evaluation.dismissed) {
    board = { ...board, objectives: careerActBoardObjectives(board.objectives, storyState, session.season) };
  }

  return {
    session: {
      ...session,
      players,
      finances,
      transferState,
      stadium,
      board,
      rivalPlayers: ageRivalPlayers(aiUpkeep.rivalPlayers),
      retiredPlayers: [...(session.retiredPlayers ?? []), ...aiRetirement.retired],
      lastSeasonAwards,
      league: resetLeagueSeason(leagueAfterMovement),
      storyState,
    },
    intakeCount: intake.length + campIntake.length,
    retiredCount: aiRetirement.retired.length,
    aiYouthCount: aiUpkeep.youth,
    aiRefillCount: aiUpkeep.refill,
    loanReturns,
    boardEvaluation: boardStep.evaluation,
    promotionRelegation,
  };
}

function generateCampIntakes(
  camps: readonly YouthCamp[],
  clubId: string,
  season: number,
  endingSeason: number,
  masterSeed: number,
  idStart: number,
  facility: AcademyFacility,
) {
  const players: Player[] = [];
  let cursor = idStart;
  for (const camp of camps) {
    const nation = campNationById(camp.id);
    if (!nation) continue;
    if (!isCampOperational(camp, season, SEASON_END_WEEK)) continue;
    const batch = generateYouthIntake({
      season,
      week: SEASON_END_WEEK,
      seasonYear: seasonCalendarYear(season),
      clubId,
      nationality: nation.code,
      region: nation.region,
      facility,
      // Ids are assigned by the caller; the cursor only seeds the batch.
      idStart: 0,
      random: mulberry32(masterSeed ^ endingSeason ^ cursor),
      count: campIntakeCountForCamp(camp),
      youthSite: camp.id,
      meanShift: campMixtureShift(camp),
      nameFor: (seed) => generateCampPlayerName(nation.code, seed),
    });
    cursor += batch.length;
    players.push(...batch);
  }
  return players;
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
