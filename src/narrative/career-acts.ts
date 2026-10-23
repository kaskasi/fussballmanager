/** Story Mode act rules (PRD 19, PRD 24, ADR 0005) — pure; the sim and engine stay untouched. */

import type { TeamId } from "@fussballmanager/shared";
import type {
  BoardObjective,
  BoardState,
  SeasonObjectiveEvaluation,
} from "../board/board-state.ts";
import { listJobOffers } from "../board/job-offers.ts";
import type { InSeasonPressureStep } from "../board/season-objectives.ts";
import { pickStoryCompanions, rankStoryBonds } from "../board/story-companions.ts";
import { t } from "../i18n/index.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { clubDisplayName } from "../sim/league-divisions.ts";
import { leagueTable } from "../sim/league-week.ts";
import type { PromotionRelegationResult } from "../sim/promotion-relegation.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { Player } from "../types/player.ts";
import { applyChronicleEntry } from "./apply.ts";
import { resolveProductGameMode } from "./game-mode.ts";
import { applyPatientChairmanObjectives } from "./season-objectives.ts";
import {
  appendFanFeed,
  type Act1Outcome,
  type LegendPlayerRef,
  type StoryState,
} from "./story-state.ts";

export type CareerDismissalPolicy = "none" | "season_end_only" | "standard";

/** Bonded old-club players remembered by name (followers included). */
export const LEGEND_PLAYER_MAX = 3;

/** Act 1 can't be lost; Act 2 has a patient chairman (season-end verdict only). */
export function careerDismissalPolicy(story: StoryState): CareerDismissalPolicy {
  if (resolveProductGameMode(story) !== "story_mode") return "standard";
  if (story.career_phase === "act1_nordstern") return "none";
  if (story.career_phase === "act2_regional") return "season_end_only";
  return "standard";
}

/** Warning letters still go out; only the mid-season sacking is withheld. */
export function guardInSeasonDismissal(
  step: InSeasonPressureStep,
  story: StoryState,
): InSeasonPressureStep {
  if (!step.dismissed || careerDismissalPolicy(story) === "standard") return step;
  return { ...step, dismissed: false, board: { ...step.board, job_status: "employed" } };
}

/** Act 1 season end is a story beat, not a board verdict. */
export function guardSeasonEndEvaluation<
  T extends { board: BoardState; evaluation: SeasonObjectiveEvaluation },
>(step: T, story: StoryState): T {
  if (!step.evaluation.dismissed || careerDismissalPolicy(story) !== "none") return step;
  const evaluation = { ...step.evaluation, dismissed: false, summary: t("board.act1.verdict") };
  return {
    ...step,
    evaluation,
    board: { ...step.board, job_status: "employed", last_evaluation: evaluation },
  };
}

export function isCareerTransitionPending(story: StoryState): boolean {
  return resolveProductGameMode(story) === "story_mode" && story.act_transition != null;
}

/** Read the Act 1 result from the sim's movements — never a forced loss (PRD 19). */
export function act1OutcomeFromMovements(
  teamId: TeamId,
  result: Pick<PromotionRelegationResult, "movements" | "playoff">,
): { outcome: Act1Outcome; viaPlayoff: boolean } {
  const movement = result.movements.find((entry) => entry.teamId === teamId);
  if (movement?.reason === "relegated") return { outcome: "relegated", viaPlayoff: false };
  if (movement?.reason === "playoff_lost") return { outcome: "relegated", viaPlayoff: true };
  const playedPlayoff =
    result.playoff?.homeTeamId === teamId || result.playoff?.awayTeamId === teamId;
  return { outcome: "survived", viaPlayoff: playedPlayoff };
}

export interface CareerActSeasonEndInput {
  story: StoryState;
  /** Pre-reset league (final table, player club, division). */
  league: LeagueState;
  promotionRelegation: Pick<PromotionRelegationResult, "pools" | "movements" | "playoff">;
  /** Players before aging/intake — bond signals intact. */
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  careerClubId: string;
  endingSeason: number;
  nextSeason: number;
  week: number;
}

function legendRef(player: Player, fromTeamId: TeamId): LegendPlayerRef {
  return {
    player_id: player.id,
    name: formatPlayerName(player),
    position: player.position,
    from_team_id: fromTeamId,
    followed: false,
  };
}

function act1EndChronicleKey(outcome: Act1Outcome, viaPlayoff: boolean): string {
  if (outcome === "relegated") return viaPlayoff ? "playoffLost" : "relegated";
  return viaPlayoff ? "playoffWon" : "survived";
}

/** Act 2 is won by promotion into the Regionalliga — direct or through the playoff (sim-derived). */
export function act2PromotedFromMovements(
  teamId: TeamId,
  result: Pick<PromotionRelegationResult, "movements">,
): boolean {
  return result.movements.some(
    (entry) =>
      entry.teamId === teamId &&
      entry.to === "regionalliga-nord" &&
      (entry.reason === "promoted" || entry.reason === "playoff_won"),
  );
}

function resolveAct2SeasonEnd(input: CareerActSeasonEndInput): StoryState {
  const { story, league } = input;
  const teamId = league.player_club_id;
  if (!act2PromotedFromMovements(teamId, input.promotionRelegation)) return story;
  const legends = story.legend_players.map((ref) => ref.name).join(", ");
  const params = { club: clubDisplayName(teamId), names: legends };
  const chronicled = applyChronicleEntry(story, {
    id: `chronicle_act2_promotion_${input.endingSeason}`,
    season: input.endingSeason,
    week: input.week,
    icon: "⬆️",
    title: t("story.act2End.title", params),
    body: legends ? t("story.act2End.bodyWithLegends", params) : t("story.act2End.body", params),
  });
  const promoted = appendFanFeed(chronicled, {
    id: `act2_promotion_${input.endingSeason}`,
    week: input.week,
    icon: "⬆️",
    speaker: story.cast.chairman_name ?? story.cast.assistant_name,
    message: t("story.act2End.feed", params),
  });
  return {
    ...promoted,
    career_phase: "act3_empire",
    act_started: { phase: "act3_empire", season: input.nextSeason, week: input.week },
    active_arc: null,
  };
}

/** Next season's board goals: Act 2 keeps its patient chairman until promotion. */
export function careerActBoardObjectives(
  objectives: readonly BoardObjective[],
  story: StoryState,
  season: number,
): BoardObjective[] {
  if (resolveProductGameMode(story) !== "story_mode" || story.career_phase !== "act2_regional") {
    return [...objectives];
  }
  return applyPatientChairmanObjectives(objectives, season);
}

/**
 * Story Mode season end. Act 1 freezes the transition (outcome, 3 offers, followers) and
 * writes the finale chronicle; Act 2 promotion opens Act 3. Returns null when the regular
 * season coda should run instead.
 */
export function resolveCareerActSeasonEnd(input: CareerActSeasonEndInput): StoryState | null {
  const { story, league } = input;
  if (resolveProductGameMode(story) !== "story_mode") return null;
  if (story.career_phase === "act2_regional") return resolveAct2SeasonEnd(input);
  if (story.career_phase !== "act1_nordstern") return null;

  const teamId = league.player_club_id;
  const { outcome, viaPlayoff } = act1OutcomeFromMovements(teamId, input.promotionRelegation);
  const finalPlace = leagueTable(league).findIndex((row) => row.teamId === teamId) + 1;
  const leagueAfter = { league_pools: input.promotionRelegation.pools, player_club_id: teamId };
  const offerOptions = { excludeTeamIds: [teamId], rivalPlayers: input.rivalPlayers };
  let offers = listJobOffers(teamId, input.nextSeason, leagueAfter, {
    ...offerOptions,
    divisionId: "oberliga-nord",
  });
  if (offers.length === 0) {
    offers = listJobOffers(teamId, input.nextSeason, leagueAfter, {
      ...offerOptions,
      divisionId: "regionalliga-nord",
    });
  }

  const captainId = story.cast.captain_player_id;
  const companions = pickStoryCompanions(
    input.players,
    input.careerClubId,
    captainId,
    input.endingSeason,
  );
  const legends = [
    ...companions,
    ...rankStoryBonds(input.players, input.careerClubId, captainId, input.endingSeason).filter(
      (player) => !companions.includes(player),
    ),
  ].slice(0, LEGEND_PLAYER_MAX);

  const key = act1EndChronicleKey(outcome, viaPlayoff);
  const params = {
    club: clubDisplayName(teamId),
    place: String(finalPlace),
    names: legends.map(formatPlayerName).join(", "),
  };
  const chronicled = applyChronicleEntry(story, {
    id: `chronicle_act1_end_${input.endingSeason}`,
    season: input.endingSeason,
    week: input.week,
    icon: outcome === "relegated" ? "⬇️" : "🛡️",
    title: t(`story.act1End.${key}.title`, params),
    body: t(`story.act1End.${key}.body`, params),
  });

  return {
    ...chronicled,
    active_arc: null,
    legend_players: legends.map((player) => legendRef(player, teamId)),
    act_transition: {
      kind: "act1_end",
      ending_season: input.endingSeason,
      from_team_id: teamId,
      outcome,
      via_playoff: viaPlayoff,
      final_place: finalPlace,
      offer_team_ids: offers.map((offer) => offer.clubId),
      companion_ids: companions.map((player) => player.id),
    },
  };
}
