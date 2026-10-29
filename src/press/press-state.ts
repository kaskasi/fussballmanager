/**
 * PRD 28 — press conferences: persisted press state (lives in `story_state.press`).
 *
 * `relationship` is how the press feels about the manager (0–100), separate from `media_hype`
 * (how much attention the club gets): a club can be famous and hated at the same time.
 */

export type PressPhase = "pre" | "post";

export type PressTone = "calm" | "confident" | "deflect" | "combative";

export const PRESS_TONES: readonly PressTone[] = ["calm", "confident", "deflect", "combative"];

/** Things a conference can be about. Investment and transfer topics come from the club state. */
export type PressTopicKind =
  | "transfer_in"
  | "transfer_out"
  | "youth_camp"
  | "stadium"
  | "training_facility"
  | "academy"
  | "sponsor"
  | "derby"
  | "six_pointer"
  | "title_race"
  | "finale"
  | "dressing_room_leak";

export interface PressTopic {
  /** Stable key — investment/transfer topics are remembered so each one is covered once. */
  id: string;
  kind: PressTopicKind;
  playerId?: string;
  params: Record<string, string | number>;
}

/** One match's conference pair: topics are frozen at the pre-match presser; kept until the next pair. */
export interface PressConferenceState {
  fixture_key: string;
  topics: PressTopic[];
  pre_done: boolean;
  post_done: boolean;
}

export interface PressEffects {
  squad: number;
  relationship: number;
  hype: number;
  pressure: number;
  fanbase: number;
  /** Extra morale per player id (praise, jealousy, shielding). */
  players: Record<string, number>;
}

export interface PressConferenceRecord {
  fixture_key: string;
  phase: PressPhase;
  season: number;
  week: number;
  delegated: boolean;
  tones: PressTone[];
  effects: PressEffects;
}

export interface PressState {
  relationship: number;
  /** Investment/transfer topic ids already covered; absent until the first scan seeds it. */
  known_topic_ids?: string[];
  conference: PressConferenceState | null;
  history: PressConferenceRecord[];
  /** Career week index (inclusive) until which only the ally journalist still talks. */
  boycott_until?: number;
  /** Career week index the hostile campaign started; null when none runs. */
  campaign_since?: number | null;
  /** Dressing-room leak: the next conference must address it. */
  leak_pending?: boolean;
}

export const PRESS_RELATIONSHIP_MIN = 0;
export const PRESS_RELATIONSHIP_MAX = 100;
export const PRESS_RELATIONSHIP_DEFAULT = 55;
export const PRESS_HISTORY_MAX = 12;

export function clampPressRelationship(value: number): number {
  return Math.min(PRESS_RELATIONSHIP_MAX, Math.max(PRESS_RELATIONSHIP_MIN, Math.round(value)));
}

export function defaultPressState(): PressState {
  return {
    relationship: PRESS_RELATIONSHIP_DEFAULT,
    conference: null,
    history: [],
    campaign_since: null,
  };
}

export function normalizePressState(raw?: Partial<PressState> | null): PressState {
  const base = defaultPressState();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    relationship: clampPressRelationship(raw.relationship ?? base.relationship),
    known_topic_ids: Array.isArray(raw.known_topic_ids) ? [...raw.known_topic_ids] : undefined,
    conference: raw.conference ?? null,
    history: Array.isArray(raw.history) ? raw.history.slice(0, PRESS_HISTORY_MAX) : [],
    campaign_since: raw.campaign_since ?? null,
  };
}

export function emptyPressEffects(): PressEffects {
  return { squad: 0, relationship: 0, hype: 0, pressure: 0, fanbase: 0, players: {} };
}

export function addPressEffects(left: PressEffects, right: PressEffects): PressEffects {
  const players = { ...left.players };
  for (const [id, delta] of Object.entries(right.players)) {
    players[id] = (players[id] ?? 0) + delta;
  }
  return {
    squad: left.squad + right.squad,
    relationship: left.relationship + right.relationship,
    hype: left.hype + right.hype,
    pressure: left.pressure + right.pressure,
    fanbase: Math.round((left.fanbase + right.fanbase) * 100) / 100,
    players,
  };
}

export function isPressBoycott(press: PressState, weekIndex: number): boolean {
  return press.boycott_until != null && weekIndex <= press.boycott_until;
}
