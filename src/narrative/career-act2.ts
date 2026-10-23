/**
 * Story Mode Act 2 — scheduled unlock beats and a minimal choice/payoff resolver
 * (PRD 19 pillar 3: chronicle line + cast beat + curtain flag per unlock; ADR 0005).
 * Effects stay on the PRD 13 allow-list: board pressure, fanbase, morale, media hype, cash.
 */

import type { BoardState } from "../board/board-state.ts";
import { spendClubCash, type ClubFinances } from "../economy/club-finances.ts";
import { t } from "../i18n/index.ts";
import { CAREER_START_WEEK, SEASON_END_WEEK } from "../sim/game-calendar.ts";
import { advanceClubFanbase } from "../stadium/fanbase.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import type { Player } from "../types/player.ts";
import {
  ACT2_ANALYSIS_MODULE_COST,
  ACT2_UNLOCK_BEATS,
  type Act2UnlockBeat,
} from "./career-act2-schedule.ts";
import type { CurtainUnlockId } from "./career-presentation.ts";
import { resolveProductGameMode } from "./game-mode.ts";
import {
  appendChronicle,
  appendFanFeed,
  clampMediaHype,
  grantCurtainUnlock,
  markBeatFired,
  type StoryInboxPayload,
  type StoryState,
} from "./story-state.ts";

const WEEKS_PER_SEASON = SEASON_END_WEEK - CAREER_START_WEEK + 1;

/** Monotonic week counter across seasons (season weeks run CAREER_START_WEEK..SEASON_END_WEEK). */
export function seasonWeekOrdinal(season: number, week: number): number {
  return (season - 1) * WEEKS_PER_SEASON + (week - CAREER_START_WEEK);
}

function ordinalToSeasonWeek(ordinal: number): { season: number; week: number } {
  return {
    season: Math.floor(ordinal / WEEKS_PER_SEASON) + 1,
    week: (ordinal % WEEKS_PER_SEASON) + CAREER_START_WEEK,
  };
}

/** 1-based week inside the current act, or null outside Story Mode Act 2. */
export function act2Week(story: StoryState, season: number, week: number): number | null {
  if (resolveProductGameMode(story) !== "story_mode") return null;
  if (story.career_phase !== "act2_regional" || !story.act_started) return null;
  const started = seasonWeekOrdinal(story.act_started.season, story.act_started.week);
  return seasonWeekOrdinal(season, week) - started + 1;
}

export function isCareerActBeat(beatId: string): boolean {
  return ACT2_UNLOCK_BEATS.some((beat) => beat.beatId === beatId);
}

function castParams(story: StoryState): Record<string, string> {
  return {
    assistant: story.cast.assistant_name,
    chairman: story.cast.chairman_name ?? story.cast.assistant_name,
  };
}

function act2BeatPayload(beat: Act2UnlockBeat, story: StoryState): StoryInboxPayload {
  const params = castParams(story);
  return {
    beatId: beat.beatId,
    source: beat.source,
    title: t(`story.beat.${beat.beatId}.title`, params),
    body: t(`story.beat.${beat.beatId}.body`, params),
    choices: beat.choices.map((choice) => ({
      id: choice.id,
      icon: choice.icon,
      label: t(`story.beat.${beat.beatId}.choice.${choice.id}`, params),
    })),
  };
}

/** The next due Act 2 unlock beat — at most one per week, in schedule order. */
export function detectCareerActBeats(
  story: StoryState,
  season: number,
  week: number,
): StoryInboxPayload[] {
  const current = act2Week(story, season, week);
  if (current == null) return [];
  const due = ACT2_UNLOCK_BEATS.find(
    (beat) => beat.actWeek <= current && !story.beats_fired.includes(beat.beatId),
  );
  return due ? [act2BeatPayload(due, story)] : [];
}

const UNLOCK_SPEAKER: Record<CurtainUnlockId, "assistant" | "chairman"> = {
  tactics_sliders: "assistant",
  stadium: "chairman",
  finances_deep: "chairman",
  scouting_regions: "assistant",
  manual_training: "assistant",
  opponent_scout: "assistant",
  transfers: "chairman",
};

/** Curtain flag + chronicle line + cast beat — one unit, never one without the others. */
export function grantStoryUnlock(
  story: StoryState,
  unlock: CurtainUnlockId,
  season: number,
  week: number,
): StoryState {
  if (story.curtain_unlocks.includes(unlock)) return story;
  const params = castParams(story);
  let next = grantCurtainUnlock(story, unlock);
  next = appendChronicle(next, {
    id: `chronicle_unlock_${unlock}`,
    season,
    week,
    icon: "🔓",
    title: t(`story.unlock.${unlock}.title`, params),
    body: t(`story.unlock.${unlock}.body`, params),
  });
  return appendFanFeed(next, {
    id: `act2_unlock_${unlock}`,
    week,
    icon: "🔓",
    speaker: params[UNLOCK_SPEAKER[unlock]]!,
    message: t(`story.unlock.${unlock}.feed`, params),
  });
}

/** Apply due `unlock:*` payoffs; other payoff effects are left for their own resolvers. */
export function resolveDuePayoffs(story: StoryState, season: number, week: number): StoryState {
  const now = seasonWeekOrdinal(season, week);
  let next = story;
  const remaining = [];
  for (const payoff of story.scheduled_payoffs) {
    const due = seasonWeekOrdinal(payoff.due_season, payoff.due_week) <= now;
    if (due && payoff.effect.startsWith("unlock:")) {
      next = grantStoryUnlock(next, payoff.effect.slice("unlock:".length) as CurtainUnlockId, season, week);
      continue;
    }
    remaining.push(payoff);
  }
  return remaining.length === story.scheduled_payoffs.length
    ? next
    : { ...next, scheduled_payoffs: remaining };
}

export interface CareerActChoiceContext {
  board: BoardState;
  stadium: ClubStadium;
  players: Player[];
  finances?: ClubFinances;
  clubId: string;
  season: number;
  week: number;
}

export interface CareerActChoiceResult {
  story: StoryState;
  board?: BoardState;
  stadium?: ClubStadium;
  players?: Player[];
  finances?: ClubFinances;
}

function withSquadMorale(players: Player[], clubId: string, delta: number): Player[] {
  return players.map((player) =>
    player.club_id === clubId && player.squad_status === "pro"
      ? {
          ...player,
          state: {
            ...player.state,
            morale: Math.min(100, Math.max(0, player.state.morale + delta)),
          },
        }
      : player,
  );
}

/** Resolve an Act 2 unlock beat: record the choice, grant or schedule the unlock, apply effects. */
export function applyCareerActChoice(
  story: StoryState,
  beatId: string,
  choiceId: string,
  ctx: CareerActChoiceContext,
): CareerActChoiceResult {
  const beat = ACT2_UNLOCK_BEATS.find((entry) => entry.beatId === beatId);
  const choice = beat?.choices.find((entry) => entry.id === choiceId);
  if (!beat || !choice) return { story };

  let next = markBeatFired(story, beatId);
  next = {
    ...next,
    choices: {
      ...next.choices,
      [beatId]: { season: ctx.season, week: ctx.week, option_id: choiceId },
    },
  };
  for (const unlock of choice.unlocks) {
    next = grantStoryUnlock(next, unlock, ctx.season, ctx.week);
  }
  if (choice.delayed) {
    const due = ordinalToSeasonWeek(seasonWeekOrdinal(ctx.season, ctx.week) + choice.delayed.weeks);
    next = {
      ...next,
      scheduled_payoffs: [
        ...next.scheduled_payoffs,
        {
          id: `${beatId}_${choiceId}`,
          choice_id: beatId,
          due_season: due.season,
          due_week: due.week,
          effect: `unlock:${choice.delayed.unlock}`,
        },
      ],
    };
  }

  const result: CareerActChoiceResult = { story: next };
  switch (`${beatId}:${choiceId}`) {
    case "act2_chair_infra_vote:roof":
      result.stadium = advanceClubFanbase(ctx.stadium, 0.5);
      result.story = { ...next, media_hype: clampMediaHype(next.media_hype + 2) };
      break;
    case "act2_chair_infra_vote:hall":
      result.players = withSquadMorale(ctx.players, ctx.clubId, 2);
      break;
    case "act2_asst_training_keys:assistant":
      result.players = withSquadMorale(ctx.players, ctx.clubId, 1);
      break;
    case "act2_salesman_analysis:buy":
      if (ctx.finances) {
        result.finances = spendClubCash(ctx.finances, ACT2_ANALYSIS_MODULE_COST, ctx.week);
      }
      break;
  }
  return result;
}
