/**
 * PRD 28 — weekly press & dressing-room tick (runs before narrative beat detection).
 *
 * Press ladder by relationship: hostile campaign (< 30, ends at 35) → the squad reads the papers
 * (< 25, morale drag) → board ultimatum (< 20 after three campaign weeks, story beat) → boycott
 * (< 12, four weeks, once a season). Morale crisis: weeks the pro squad's average morale sits
 * below 30; at four weeks the unrest leaks and the unhappiest players ask to leave.
 */

import type { BoardState } from "../board/board-state.ts";
import type { StoryState } from "../narrative/story-state.ts";
import { advanceClubFanbase } from "../stadium/fanbase.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import type { Player } from "../types/player.ts";
import {
  clampPressRelationship,
  isPressBoycott,
  normalizePressState,
  PRESS_RELATIONSHIP_DEFAULT,
} from "./press-state.ts";
import { seedKnownTopicIds } from "./press-triggers.ts";

export const PRESS_CAMPAIGN_LINE = 30;
export const PRESS_CAMPAIGN_END = 35;
export const PRESS_PAPERS_LINE = 25;
export const PRESS_ULTIMATUM_LINE = 20;
export const PRESS_ULTIMATUM_CAMPAIGN_WEEKS = 3;
export const PRESS_BOYCOTT_LINE = 12;
export const PRESS_BOYCOTT_WEEKS = 4;
export const PRESS_CAMPAIGN_PRESSURE = 1;
export const PRESS_CAMPAIGN_FANBASE = -0.15;
export const PRESS_PAPERS_MORALE = -1;
export const PRESS_LEAK_RELATIONSHIP = -4;

export const MORALE_CRISIS_LINE = 30;
/** Players' council + assistant proposal. */
export const MORALE_CRISIS_WEEKS = 2;
/** Leak to the press + transfer requests. */
export const MORALE_CRISIS_DEEP_WEEKS = 4;
export const TRANSFER_REQUEST_COUNT = 2;

export function seasonBeatId(templateId: string, season: number): string {
  return `${templateId}_s${season}`;
}

function proSquad(players: readonly Player[], clubId: string): Player[] {
  return players.filter((player) => player.club_id === clubId && player.squad_status === "pro");
}

export function averageProMorale(players: readonly Player[], clubId: string): number {
  const pros = proSquad(players, clubId);
  if (pros.length === 0) return 50;
  return pros.reduce((sum, player) => sum + player.state.morale, 0) / pros.length;
}

/** Unhappiest pros first (only the starting-level ones get a hearing in the press). */
export function transferRequestCandidates(players: readonly Player[], clubId: string): Player[] {
  return proSquad(players, clubId)
    .filter((player) => !player.state.desire_to_leave)
    .sort((left, right) => left.state.morale - right.state.morale || right.market_value - left.market_value)
    .slice(0, TRANSFER_REQUEST_COUNT);
}

export interface PressWeekInput {
  story: StoryState;
  players: Player[];
  board: BoardState;
  stadium: ClubStadium;
  clubId: string;
  season: number;
  week: number;
  /** For seeding the covered-topic list on the first tick of a save. */
  topicSession: Parameters<typeof seedKnownTopicIds>[0];
}

export interface PressWeekResult {
  story: StoryState;
  players: Player[];
  board: BoardState;
  stadium: ClubStadium;
}

export function advancePressWeek(input: PressWeekInput): PressWeekResult {
  const now = careerWeekIndex(input.season, input.week);
  const fired = new Set(input.story.beats_fired);
  let press = normalizePressState(input.story.press);
  let players = input.players;
  let board = input.board;
  let stadium = input.stadium;

  if (!press.known_topic_ids) {
    press = { ...press, known_topic_ids: seedKnownTopicIds(input.topicSession) };
  }

  if (press.campaign_since == null && press.relationship < PRESS_CAMPAIGN_LINE) {
    press = { ...press, campaign_since: now };
  } else if (press.campaign_since != null && press.relationship >= PRESS_CAMPAIGN_END) {
    press = { ...press, campaign_since: null };
  }

  if (press.campaign_since != null) {
    board = { ...board, pressure: Math.min(100, board.pressure + PRESS_CAMPAIGN_PRESSURE) };
    stadium = advanceClubFanbase(stadium, PRESS_CAMPAIGN_FANBASE);
  } else if (press.relationship !== PRESS_RELATIONSHIP_DEFAULT) {
    // Without a campaign the news cycle moves on: one point a week back to neutral.
    const step = press.relationship < PRESS_RELATIONSHIP_DEFAULT ? 1 : -1;
    press = { ...press, relationship: clampPressRelationship(press.relationship + step) };
  }

  const squadIds = new Set(proSquad(players, input.clubId).map((player) => player.id));
  const adjustMorale = (ids: ReadonlySet<string>, delta: number) => {
    players = players.map((player) =>
      ids.has(player.id)
        ? {
            ...player,
            state: { ...player.state, morale: Math.min(100, Math.max(0, player.state.morale + delta)) },
          }
        : player,
    );
  };

  if (press.relationship < PRESS_PAPERS_LINE) {
    adjustMorale(squadIds, PRESS_PAPERS_MORALE);
  }

  if (press.boycott_until != null && !isPressBoycott(press, now)) {
    press = { ...press, boycott_until: undefined };
  }
  if (
    press.relationship < PRESS_BOYCOTT_LINE &&
    press.boycott_until == null &&
    !fired.has(seasonBeatId("press_crisis_boycott", input.season))
  ) {
    press = { ...press, boycott_until: now + PRESS_BOYCOTT_WEEKS - 1 };
  }

  const lowWeeks =
    averageProMorale(players, input.clubId) < MORALE_CRISIS_LINE ? (input.story.morale_low_weeks ?? 0) + 1 : 0;

  if (lowWeeks === MORALE_CRISIS_DEEP_WEEKS) {
    if (!fired.has(seasonBeatId("morale_crisis_leak", input.season))) {
      press = {
        ...press,
        leak_pending: true,
        relationship: clampPressRelationship(press.relationship + PRESS_LEAK_RELATIONSHIP),
      };
    }
    if (!fired.has(seasonBeatId("morale_crisis_requests", input.season))) {
      const requests = new Set(transferRequestCandidates(players, input.clubId).map((player) => player.id));
      players = players.map((player) =>
        requests.has(player.id) ? { ...player, state: { ...player.state, desire_to_leave: true } } : player,
      );
    }
  }

  return {
    story: { ...input.story, press, morale_low_weeks: lowWeeks },
    players,
    board,
    stadium,
  };
}
