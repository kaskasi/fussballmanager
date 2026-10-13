/** Persisted narrative state (PRD 13, PRD 19) — lives in `pipeline.story_state`. */

import {
  featureCurtainForPhase,
  fullFeatureCurtain,
  type CareerPhase,
  type FeatureCurtain,
} from "./career-presentation.ts";
import { resolveProductGameMode, type ProductGameMode } from "./game-mode.ts";

export type { CareerPhase, FeatureCurtain } from "./career-presentation.ts";
export type { ProductGameMode } from "./game-mode.ts";

export type CareerOrigin = "raffle" | "passionate_letter" | "community_takeover";

export type ActiveArc = "relegation_battle" | null;

export interface StoryChoiceRecord {
  season: number;
  week: number;
  option_id: string;
}

export interface ScheduledPayoff {
  id: string;
  choice_id: string;
  due_season: number;
  due_week: number;
  effect: string;
}

export type StoryBeatSource =
  | "press"
  | "fan"
  | "captain"
  | "assistant"
  | "board"
  | "origin";

export interface StoryCast {
  assistant_name: string;
  captain_player_id: string | null;
  bratwurst_vendor_name: string;
  fan_rep_label: string;
  journalist_hostile_name: string;
  journalist_ally_name: string;
  groundskeeper_name: string;
}

export interface FanFeedBeat {
  id: string;
  week: number;
  icon: string;
  speaker: string;
  message: string;
}

export interface ChronicleEntry {
  id: string;
  season: number;
  week: number;
  title: string;
  body: string;
  icon: string;
}

export interface StoryInboxPayload {
  beatId: string;
  title: string;
  body: string;
  source: StoryBeatSource;
  choices: Array<{ id: string; label: string; icon: string }>;
}

/** PRD 25 — per-save coach mark progress (screen ids match shell Screen). */
export interface TutorialState {
  version: 1;
  disabled: boolean;
  completed_step_ids: string[];
  dismissed_screens: string[];
}

export function defaultTutorialState(): TutorialState {
  return {
    version: 1,
    disabled: false,
    completed_step_ids: [],
    dismissed_screens: [],
  };
}

export function normalizeTutorialState(raw?: TutorialState): TutorialState {
  const base = defaultTutorialState();
  if (!raw) return base;
  return {
    version: 1,
    disabled: Boolean(raw.disabled),
    completed_step_ids: Array.isArray(raw.completed_step_ids)
      ? [...raw.completed_step_ids]
      : [],
    dismissed_screens: Array.isArray(raw.dismissed_screens) ? [...raw.dismissed_screens] : [],
  };
}

export interface StoryState {
  active_arc: ActiveArc;
  arc_started_week: number | null;
  career_origin: CareerOrigin | null;
  opening_complete: boolean;
  /** PRD 24 — product mode; default regionalliga_manager for new saves. */
  game_mode?: ProductGameMode;
  career_phase: CareerPhase;
  feature_curtain: FeatureCurtain;
  choices: Record<string, StoryChoiceRecord>;
  scheduled_payoffs: ScheduledPayoff[];
  cast: StoryCast;
  beats_fired: string[];
  media_hype: number;
  fan_feed: FanFeedBeat[];
  chronicle_entries: ChronicleEntry[];
  tutorial?: TutorialState;
}

export const FAN_FEED_MAX = 8;
export const MEDIA_HYPE_MIN = 0;
export const MEDIA_HYPE_MAX = 100;

export function defaultStoryCast(): StoryCast {
  return {
    assistant_name: "Assistenztrainer",
    captain_player_id: null,
    bratwurst_vendor_name: "Karl vom Bratwurststand",
    fan_rep_label: "Kurvenstand Nord",
    journalist_hostile_name: "Lokale Presse",
    journalist_ally_name: "Elena Kruse",
    groundskeeper_name: "Heinz, Platzwart",
  };
}

/** PRD 24 — full features, regional world, PRD 13 story layer without act curtain. */
export function regionalligaManagerStoryState(week = 1): StoryState {
  const career_phase = "full";
  return {
    active_arc: "relegation_battle",
    arc_started_week: week,
    career_origin: null,
    opening_complete: false,
    game_mode: "regionalliga_manager",
    career_phase,
    feature_curtain: fullFeatureCurtain(),
    choices: {},
    scheduled_payoffs: [],
    cast: defaultStoryCast(),
    beats_fired: [],
    media_hype: 42,
    fan_feed: [],
    chronicle_entries: [],
    tutorial: defaultTutorialState(),
  };
}

/** PRD 19 / Story Mode — act 1 tutorial curtain (not default for new games). */
export function storyModeAct1StoryState(week = 1): StoryState {
  const career_phase = "act1_nordstern";
  return {
    ...regionalligaManagerStoryState(week),
    game_mode: "story_mode",
    career_phase,
    feature_curtain: featureCurtainForPhase(career_phase),
  };
}

export function defaultStoryState(week = 1): StoryState {
  return regionalligaManagerStoryState(week);
}

/** Legacy / sandbox saves — full UI, no tutorial curtain. */
export function fullGameStoryState(base: StoryState): StoryState {
  return {
    ...base,
    career_phase: "full",
    feature_curtain: fullFeatureCurtain(),
  };
}

export function normalizeStoryState(state?: StoryState, week = 1): StoryState {
  const base = defaultStoryState(week);
  if (!state) return base;
  const game_mode = resolveProductGameMode(state);
  let career_phase = state.career_phase ?? base.career_phase;
  if (game_mode === "regionalliga_manager" || game_mode === "new_game_plus") {
    career_phase = "full";
  }
  return {
    ...base,
    ...state,
    game_mode,
    career_phase,
    feature_curtain: featureCurtainForPhase(career_phase),
    choices: state.choices ?? {},
    scheduled_payoffs: state.scheduled_payoffs ?? [],
    cast: { ...base.cast, ...state.cast },
    beats_fired: state.beats_fired ?? [],
    fan_feed: state.fan_feed ?? [],
    chronicle_entries: state.chronicle_entries ?? [],
    media_hype: clampMediaHype(state.media_hype ?? base.media_hype),
    tutorial: normalizeTutorialState(state.tutorial ?? base.tutorial),
  };
}

export function clampMediaHype(value: number): number {
  return Math.min(MEDIA_HYPE_MAX, Math.max(MEDIA_HYPE_MIN, Math.round(value)));
}

export function appendFanFeed(state: StoryState, beat: FanFeedBeat): StoryState {
  const fan_feed = [beat, ...state.fan_feed].slice(0, FAN_FEED_MAX);
  return { ...state, fan_feed };
}

export function markBeatFired(state: StoryState, beatId: string): StoryState {
  if (state.beats_fired.includes(beatId)) return state;
  return { ...state, beats_fired: [...state.beats_fired, beatId] };
}

export function appendChronicle(
  state: StoryState,
  entry: ChronicleEntry,
): StoryState {
  if (state.chronicle_entries.some((item) => item.id === entry.id)) {
    return state;
  }
  return {
    ...state,
    chronicle_entries: [entry, ...state.chronicle_entries],
  };
}
