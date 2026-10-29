/**
 * PRD 28 — one press conference: 2–3 journalist questions, each answered with a tone.
 *
 * Deterministic from the save seed. Effects stay inside the PRD 13 allow-list (morale, media
 * hype, board pressure, fanbase) plus the press relationship. Text lives in i18n (`press.*`).
 */

import { careerPositionToRole } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  addPressEffects,
  emptyPressEffects,
  PRESS_TONES,
  type PressEffects,
  type PressPhase,
  type PressTone,
  type PressTopic,
  type PressTopicKind,
} from "./press-state.ts";

export type PressQuestionKind =
  | PressTopicKind
  | "result_win"
  | "result_draw"
  | "result_loss"
  | "standout_player"
  | "star_benched"
  | "youth_start"
  | "job_pressure"
  | "expectations";

export type PressJournalist = "hostile" | "ally";

export type PressMatchResult = "win" | "draw" | "loss";

export interface PressQuestion {
  id: string;
  kind: PressQuestionKind;
  journalist: PressJournalist;
  topicId?: string;
  playerId?: string;
  params: Record<string, string | number>;
}

export interface PressConference {
  phase: PressPhase;
  fixtureKey: string;
  questions: PressQuestion[];
  /** Topics frozen for this match (pre and post share them). */
  topics: PressTopic[];
  boycott: boolean;
  result?: PressMatchResult;
}

export const PRESS_MAX_QUESTIONS = 3;
export const PRESS_MIN_QUESTIONS = 2;

/** Youth debut line in the starting XI. */
const YOUTH_START_MAX_AGE = 19;

const INVESTMENT_KINDS = new Set<PressQuestionKind>([
  "youth_camp",
  "stadium",
  "training_facility",
  "academy",
  "sponsor",
]);
const KEY_MATCH_KINDS = new Set<PressQuestionKind>(["derby", "six_pointer", "title_race", "finale"]);
const PLAYER_KINDS = new Set<PressQuestionKind>([
  "transfer_in",
  "standout_player",
  "star_benched",
  "youth_start",
]);

export function isInvestmentKind(kind: PressQuestionKind): boolean {
  return INVESTMENT_KINDS.has(kind);
}

export function isKeyMatchKind(kind: PressQuestionKind): boolean {
  return KEY_MATCH_KINDS.has(kind);
}

function rng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pressSeed(parts: readonly (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (const ch of String(part)) {
      hash = Math.imul(hash ^ ch.charCodeAt(0), 0x01000193);
    }
    hash = Math.imul(hash ^ 0x7c, 0x01000193);
  }
  return hash >>> 0;
}

/** Bad relations bring the hostile outlet to the front row; the ally keeps a seat either way. */
function pickJournalist(relationship: number, roll: number): PressJournalist {
  const hostileShare = Math.min(0.85, Math.max(0.15, (70 - relationship) / 60));
  return roll < hostileShare ? "hostile" : "ally";
}

export interface BuildConferenceInput {
  phase: PressPhase;
  fixtureKey: string;
  seed: number;
  relationship: number;
  boycott: boolean;
  topics: readonly PressTopic[];
  leakPending: boolean;
  players: readonly Player[];
  clubId: string;
  /** Pre-match: the confirmed XI, so journalists can ask about it. */
  starterIds?: readonly string[];
  /** Post-match. */
  result?: PressMatchResult;
  goalsFor?: number;
  goalsAgainst?: number;
  opponentName?: string;
  standoutPlayerId?: string;
  boardPressure?: number;
}

function topicQuestion(topic: PressTopic): Omit<PressQuestion, "id" | "journalist"> {
  return { kind: topic.kind, topicId: topic.id, playerId: topic.playerId, params: { ...topic.params } };
}

function lineupQuestion(input: BuildConferenceInput): Omit<PressQuestion, "id" | "journalist"> | null {
  if (!input.starterIds?.length) return null;
  const starters = new Set(input.starterIds);
  const pros = input.players.filter(
    (player) => player.club_id === input.clubId && player.squad_status === "pro",
  );
  const star = pros
    .filter((player) => !player.state.injury)
    .sort((left, right) => right.market_value - left.market_value)[0];
  if (star && !starters.has(star.id)) {
    return { kind: "star_benched", playerId: star.id, params: { player: formatPlayerName(star) } };
  }
  const youth = pros
    .filter((player) => starters.has(player.id) && player.age <= YOUTH_START_MAX_AGE)
    .sort((left, right) => left.state.season_apps - right.state.season_apps)[0];
  if (youth) {
    return { kind: "youth_start", playerId: youth.id, params: { player: formatPlayerName(youth) } };
  }
  return null;
}

function preQuestions(input: BuildConferenceInput): Omit<PressQuestion, "id" | "journalist">[] {
  const items: Omit<PressQuestion, "id" | "journalist">[] = [];
  if (input.leakPending) {
    items.push({ kind: "dressing_room_leak", params: {} });
  }
  const order = (topic: PressTopic) =>
    topic.kind === "transfer_in" ? 0 : topic.kind === "transfer_out" ? 1 : isKeyMatchKind(topic.kind) ? 3 : 2;
  const club = [...input.topics].filter((topic) => !isKeyMatchKind(topic.kind)).sort((l, r) => order(l) - order(r));
  const keyMatch = input.topics.find((topic) => isKeyMatchKind(topic.kind));
  const clubSlots = keyMatch ? PRESS_MAX_QUESTIONS - 1 - items.length : PRESS_MAX_QUESTIONS - items.length;
  for (const topic of club.slice(0, Math.max(0, clubSlots))) items.push(topicQuestion(topic));
  if (keyMatch && items.length < PRESS_MAX_QUESTIONS) items.push(topicQuestion(keyMatch));
  if (items.length < PRESS_MAX_QUESTIONS) {
    const lineup = lineupQuestion(input);
    if (lineup) items.push(lineup);
  }
  while (items.length < PRESS_MIN_QUESTIONS) items.push({ kind: "expectations", params: {} });
  return items.slice(0, PRESS_MAX_QUESTIONS);
}

function postQuestions(input: BuildConferenceInput): Omit<PressQuestion, "id" | "journalist">[] {
  const result = input.result ?? "draw";
  const score = { goalsFor: input.goalsFor ?? 0, goalsAgainst: input.goalsAgainst ?? 0 };
  const items: Omit<PressQuestion, "id" | "journalist">[] = [
    { kind: `result_${result}`, params: { ...score, opponent: input.opponentName ?? "" } },
  ];
  const signing = input.topics.find(
    (topic) =>
      topic.kind === "transfer_in" &&
      input.players.some((player) => player.id === topic.playerId && player.club_id === input.clubId),
  );
  const keyMatch = input.topics.find((topic) => isKeyMatchKind(topic.kind));
  if (signing) items.push(topicQuestion(signing));
  else if (keyMatch) items.push(topicQuestion(keyMatch));
  else if (input.topics[0]) items.push(topicQuestion(input.topics[0]));

  if (result === "loss" && (input.boardPressure ?? 0) >= 50) {
    items.push({ kind: "job_pressure", params: {} });
  } else if (result !== "loss" && input.standoutPlayerId) {
    const standout = input.players.find((player) => player.id === input.standoutPlayerId);
    if (standout && standout.id !== signing?.playerId) {
      items.push({
        kind: "standout_player",
        playerId: standout.id,
        params: { player: formatPlayerName(standout) },
      });
    }
  }
  while (items.length < PRESS_MIN_QUESTIONS) items.push({ kind: "expectations", params: {} });
  return items.slice(0, PRESS_MAX_QUESTIONS);
}

export function buildPressConference(input: BuildConferenceInput): PressConference {
  const random = rng(input.seed);
  let drafts = input.phase === "pre" ? preQuestions(input) : postQuestions(input);
  if (input.boycott) drafts = drafts.slice(0, 1);
  const questions = drafts.map((draft, index) => ({
    ...draft,
    id: `${input.fixtureKey}:${input.phase}:${index}`,
    journalist: input.boycott ? ("ally" as const) : pickJournalist(input.relationship, random()),
  }));
  return {
    phase: input.phase,
    fixtureKey: input.fixtureKey,
    questions,
    topics: [...input.topics],
    boycott: input.boycott,
    result: input.result,
  };
}

type ClubDelta = Omit<PressEffects, "players">;

const TONE_BASE: Record<PressTone, ClubDelta> = {
  calm: { squad: 1, relationship: 2, hype: 0, pressure: -1, fanbase: 0 },
  confident: { squad: 2, relationship: 1, hype: 3, pressure: 1, fanbase: 0.1 },
  deflect: { squad: 1, relationship: -2, hype: -1, pressure: 0, fanbase: 0 },
  combative: { squad: 2, relationship: -5, hype: -2, pressure: 2, fanbase: 0.3 },
};

const ZERO: ClubDelta = { squad: 0, relationship: 0, hype: 0, pressure: 0, fanbase: 0 };

function delta(squad: number, relationship: number, hype: number, pressure: number, fanbase = 0): ClubDelta {
  return { squad, relationship, hype, pressure, fanbase };
}

/** Situation on top of the tone: a confident line after a defeat reads as denial, and so on. */
function kindModifier(kind: PressQuestionKind, tone: PressTone): ClubDelta {
  if (kind === "result_loss") {
    return { calm: delta(0, 0, 0, -1), confident: delta(-3, -2, 0, 2), deflect: delta(0, -1, 0, 1), combative: delta(1, -1, 0, 0, 0.1) }[tone];
  }
  if (kind === "result_win") {
    return { calm: delta(1, 1, 0, 0), confident: delta(1, 0, 2, 0, 0.2), deflect: ZERO, combative: delta(-1, -1, 0, 0) }[tone];
  }
  if (isKeyMatchKind(kind)) {
    return { calm: delta(0, 0, 0, -1), confident: delta(1, 0, 1, 1, 0.2), deflect: delta(-1, 0, 0, 0), combative: delta(1, 0, 0, 0, 0.2) }[tone];
  }
  if (isInvestmentKind(kind)) {
    return { calm: delta(-1, 0, 0, -1), confident: delta(-1, 0, 1, 0, 0.3), deflect: delta(-1, -1, 0, 0), combative: delta(-1, 0, 0, 1) }[tone];
  }
  if (kind === "transfer_out") {
    return { calm: delta(0, 1, 0, -1), confident: delta(-1, 0, 1, 1, -0.2), deflect: delta(0, -1, 0, 0, -0.1), combative: delta(0, 0, 0, 0, 0.1) }[tone];
  }
  if (kind === "job_pressure") {
    return { calm: delta(0, 1, 0, -2), confident: delta(1, 0, 0, 1), deflect: delta(0, -1, 0, 1), combative: delta(1, -2, 0, 2, 0.2) }[tone];
  }
  if (kind === "dressing_room_leak") {
    return { calm: delta(1, 1, 0, 0), confident: delta(-4, -3, 0, 1), deflect: delta(-2, -1, 0, 1), combative: delta(0, -1, 0, 1) }[tone];
  }
  return ZERO;
}

/** Praise lifts the player and stings his positional rivals; shielding him costs press goodwill. */
const PLAYER_SUBJECT: Record<PressTone, number> = { calm: 2, confident: 5, deflect: 0, combative: 3 };
const JEALOUSY = -2;

export interface PressAnswerContext {
  players: readonly Player[];
  clubId: string;
}

export function pressAnswerEffects(
  question: PressQuestion,
  tone: PressTone,
  context: PressAnswerContext,
): PressEffects {
  const base = TONE_BASE[tone];
  const modifier = kindModifier(question.kind, tone);
  let relationship = base.relationship + modifier.relationship;
  if (question.journalist === "hostile" && relationship > 0) relationship -= 1;
  if (question.journalist === "ally") relationship += tone === "combative" ? -2 : relationship > 0 ? 1 : 0;

  const players: Record<string, number> = {};
  if (PLAYER_KINDS.has(question.kind) && question.playerId) {
    const subject = context.players.find((player) => player.id === question.playerId);
    players[question.playerId] = PLAYER_SUBJECT[tone];
    if (subject && tone === "confident") {
      const role = careerPositionToRole(subject.position);
      for (const rival of context.players) {
        if (
          rival.id !== subject.id &&
          rival.club_id === context.clubId &&
          rival.squad_status === "pro" &&
          careerPositionToRole(rival.position) === role
        ) {
          players[rival.id] = JEALOUSY;
        }
      }
    }
    if (tone === "combative") relationship -= 1;
  }

  return {
    squad: base.squad + modifier.squad,
    relationship,
    hype: base.hype + modifier.hype,
    pressure: base.pressure + modifier.pressure,
    fanbase: Math.round((base.fanbase + modifier.fanbase) * 100) / 100,
    players,
  };
}

export function pressConferenceEffects(
  conference: PressConference,
  tones: readonly PressTone[],
  context: PressAnswerContext,
): PressEffects {
  return conference.questions.reduce(
    (sum, question, index) =>
      addPressEffects(sum, pressAnswerEffects(question, tones[index] ?? "calm", context)),
    emptyPressEffects(),
  );
}

/** How the assistant weighs an answer: dressing room first, then press goodwill, then the board. */
function answerScore(effects: PressEffects): number {
  const playerSum = Object.values(effects.players).reduce((sum, value) => sum + value, 0);
  return (
    effects.squad * 1.5 +
    effects.relationship * 0.6 +
    effects.hype * 0.3 -
    effects.pressure * 0.8 +
    effects.fanbase * 4 +
    playerSum * 0.2
  );
}

export interface PressDelegation {
  tones: PressTone[];
  /** Unsure assistants sometimes say something unfortunate on top. */
  gaffe: boolean;
}

/** Gaffe cost on top of the chosen answers (unsure assistant only). */
export const PRESS_GAFFE: PressEffects = {
  squad: -1,
  relationship: -3,
  hype: 1,
  pressure: 1,
  fanbase: 0,
  players: {},
};

/**
 * AGENTS.md — staff output follows the staff skill: a sharp assistant picks the best tone every
 * time, a solid one mostly, a patchy one half the time, an unsure one guesses and may slip up.
 */
export function assistantPressTones(
  conference: PressConference,
  quality: number,
  context: PressAnswerContext,
  seed: number,
): PressDelegation {
  const random = rng(seed ^ 0x5bd1e995);
  const tones = conference.questions.map((question) => {
    const ranked = [...PRESS_TONES].sort(
      (left, right) =>
        answerScore(pressAnswerEffects(question, right, context)) -
        answerScore(pressAnswerEffects(question, left, context)),
    );
    const roll = random();
    if (quality >= 75) return ranked[0]!;
    if (quality >= 60) return roll < 0.75 ? ranked[0]! : ranked[1]!;
    if (quality >= 48) return roll < 0.5 ? ranked[0]! : ranked[1 + Math.floor(random() * 3)]!;
    return PRESS_TONES[Math.floor(random() * PRESS_TONES.length)]!;
  });
  const gaffe = quality < 48 && random() < 0.2;
  return { tones, gaffe };
}
