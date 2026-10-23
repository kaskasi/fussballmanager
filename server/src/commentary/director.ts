import type { BroadcastStoryContext, MatchEvent, TeamId } from "@fussballmanager/shared";
import { classifyBeat, type BroadcastBeatId } from "./beats.ts";
import {
  chainFlushI18nKey,
  chainFlushLine,
  shotLinePrefix,
  type MacroBeatId,
} from "./chain-copy.ts";
import type { CommentaryContext } from "./render.ts";
import { commentaryI18n, macroCommentaryI18n } from "./i18n-keys.ts";
import { lineCopyI18n } from "./line-copy.ts";
import { momentI18nKey, momentI18nParams, momentLineText } from "./moment-copy.ts";
import { attackingThird, defensiveThird } from "./pitch-thirds.ts";
import { commentate, formatClock, isCommentaryWorthy } from "./render.ts";
import { shouldEmitMoment, shouldEmitPlayByPlay } from "./suppression.ts";
import { pickStoryColorLine, type StorySlotId } from "./story-slots.ts";

export type { MacroBeatId } from "./chain-copy.ts";

export type DirectorMode = "idle" | "set_piece" | "attack" | "stoppage";

export type HighlightLevel = "key" | "extended" | "full";

export type DirectorEmittedLine = {
  seq: number;
  beatId: BroadcastBeatId;
  voice: "pbp" | "color" | "moment";
  /** ADR 0004 — which highlight level shows this line. */
  level: HighlightLevel;
  text: string;
  macroId?: MacroBeatId;
  storySlot?: StorySlotId;
  i18nKey?: string;
  i18nParams?: Record<string, string>;
};

type PendingCounter = { teamId: TeamId; startSeq: number };
type PendingSetPiece = { teamId: TeamId; startSeq: number };

export type DirectorState = {
  mode: DirectorMode;
  attackTeamId: TeamId | null;
  chainDepth: number;
  cooldownColorUntilSeq: number;
  lastBeatId: BroadcastBeatId | null;
  recent: MatchEvent[];
  pendingCounter: PendingCounter | null;
  pendingSetPiece: PendingSetPiece | null;
  storySlotsFired: Set<StorySlotId>;
  lastMomentSeq: number;
  lastMomentBeat: BroadcastBeatId | null;
  lastFullLineSeq: number;
};

const RECENT_MAX = 12;
const COLOR_COOLDOWN_TICKS = 18;
const MOMENT_DEDUPE_TICKS = 8;
const CHAIN_BUFFER_BEATS: ReadonlySet<BroadcastBeatId> = new Set([
  "pass_key",
  "carry_progress",
  "pass_incomplete",
]);
const CHAIN_BREAK_BEATS: ReadonlySet<BroadcastBeatId> = new Set([
  "turnover",
  "offside",
  "restart_goal_kick",
  "restart_throw_in",
  "foul",
]);
/** Build-up lines for the Full level: a pass into space, a run, a duel won. */
const BUILDUP_BEATS: ReadonlySet<BroadcastBeatId> = new Set([
  "pass_key",
  "carry_progress",
  "duel_won",
  "turnover",
  "foul",
]);
/** At most one build-up line every few events (~15 s), so Full reads like radio, not a pass log. */
const FULL_LINE_MIN_SEQ_GAP = 4;
/** Shots from inside this distance are big chances and show at the Key level. */
const BIG_CHANCE_DISTANCE = 12;
const KEY_BEATS: ReadonlySet<BroadcastBeatId> = new Set([
  "match_opening",
  "second_half_open",
  "half_time",
  "full_time",
  "shot_goal",
  "shot_woodwork",
  "card_yellow",
  "card_red",
  "restart_penalty",
  "injury",
  "substitution",
]);
const SET_PIECE_SHOT_WINDOW = 15;
const COUNTER_SHOT_WINDOW = 12;
const MACRO_NEAR_MISS_WINDOW = 6;
const PRESS_TURNOVER_WINDOW = 3;
const WIDE_SWITCH_WINDOW = 5;
const BOX_SIEGE_WINDOW = 10;

const COLOR_LINES: Record<MacroBeatId, readonly string[]> = {
  macro_press_turnover: [
    "Die erste Pressing-Lücke — genau da wollten sie hin.",
    "Ballgewinn unter Druck, das Team nimmt Tempo auf.",
  ],
  macro_wide_switch: [
    "Seitenwechsel — jetzt die andere Seite.",
    "Der Ball ist rüber, die Kette muss umschichten.",
  ],
  macro_box_siege: [
    "Dauerdruck im Strafraum.",
    "Die Zweite Welle rollt — Abwehr unter Dauerbeschuss.",
  ],
  macro_counter: [
    "Konter läuft — Platz nach vorne.",
    "Schneller Umschaltmoment.",
  ],
  macro_set_piece_threat: [
    "Die Standardsituation wird gefährlich.",
    "Aus dem ruhenden Ball plötzlich Zug zum Tor.",
  ],
  macro_near_miss: [
    "Die große Chance — knapp vorbei.",
    "Da war mehr drin.",
  ],
};

function hashPick(seed: number, seq: number, macroId: MacroBeatId, variants: number): number {
  let hash = seed ^ seq;
  for (const ch of macroId) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return (hash >>> 0) % variants;
}

function isSetPieceRestart(beat: BroadcastBeatId): boolean {
  return (
    beat === "restart_corner" ||
    beat === "restart_free_kick" ||
    beat === "restart_penalty"
  );
}

function isShotBeat(beat: BroadcastBeatId): boolean {
  return beat.startsWith("shot_");
}

/** Shot (or its save) from close range: a big chance. Uses only the event's own positions. */
function isBigChance(event: MatchEvent, homeTeamId: TeamId): boolean {
  const shooter =
    event.type === "shot" ? event.shooter : event.type === "save" ? event.shooter : null;
  if (!shooter) return false;
  const mouthX = shooter.teamId === homeTeamId ? 100 : 0;
  return (
    Math.hypot(mouthX - shooter.position.x, 50 - shooter.position.y) <= BIG_CHANCE_DISTANCE
  );
}

/** Play-by-play level: structure, goals, cards and big chances are Key; other shots Extended. */
function pbpLevel(
  beat: BroadcastBeatId,
  event: MatchEvent,
  macroId: MacroBeatId | null,
  homeTeamId: TeamId,
): HighlightLevel {
  if (KEY_BEATS.has(beat)) return "key";
  if (isShotBeat(beat)) {
    return macroId === "macro_near_miss" || isBigChance(event, homeTeamId) ? "key" : "extended";
  }
  return BUILDUP_BEATS.has(beat) ? "full" : "extended";
}

function updateMode(
  current: DirectorMode,
  beat: BroadcastBeatId,
): DirectorMode {
  if (beat.startsWith("restart_")) {
    return "set_piece";
  }
  if (
    beat === "foul" ||
    beat === "card_yellow" ||
    beat === "card_red" ||
    beat === "offside" ||
    beat === "injury" ||
    beat === "substitution"
  ) {
    return "stoppage";
  }
  if (
    isShotBeat(beat) ||
    beat === "full_time" ||
    beat === "half_time" ||
    beat === "match_opening" ||
    beat === "second_half_open"
  ) {
    return "idle";
  }
  if (
    beat === "pass_complete" ||
    beat === "pass_key" ||
    beat === "pass_incomplete" ||
    beat === "carry_progress" ||
    beat === "duel_won" ||
    beat === "turnover"
  ) {
    return "attack";
  }
  return current;
}

function pushRecent(state: DirectorState, event: MatchEvent): void {
  state.recent.push(event);
  if (state.recent.length > RECENT_MAX) {
    state.recent.shift();
  }
}

function notePendingFromEvent(
  state: DirectorState,
  event: MatchEvent,
  beat: BroadcastBeatId,
  homeTeamId: TeamId,
): void {
  if (event.type === "turnover" && event.reason !== "offside") {
    if (
      defensiveThird(event.ball.x, event.fromTeamId, homeTeamId)
    ) {
      state.pendingCounter = {
        teamId: event.toTeamId,
        startSeq: event.seq,
      };
    }
  }
  if (event.type === "restart" && isSetPieceRestart(beat)) {
    state.pendingSetPiece = {
      teamId: event.takingTeamId,
      startSeq: event.seq,
    };
  }
}

function detectMacro(
  state: DirectorState,
  event: MatchEvent,
  beat: BroadcastBeatId,
  homeTeamId: TeamId,
): MacroBeatId | null {
  const seq = event.seq;

  if (isShotBeat(beat)) {
    const shooterTeam =
      event.type === "shot"
        ? event.shooter.teamId
        : event.type === "goal"
          ? event.scorer.teamId
          : event.type === "save"
            ? event.shooter.teamId
            : null;

    if (
      state.pendingSetPiece &&
      shooterTeam === state.pendingSetPiece.teamId &&
      seq - state.pendingSetPiece.startSeq <= SET_PIECE_SHOT_WINDOW
    ) {
      return "macro_set_piece_threat";
    }
    if (
      state.pendingCounter &&
      shooterTeam === state.pendingCounter.teamId &&
      seq - state.pendingCounter.startSeq <= COUNTER_SHOT_WINDOW
    ) {
      return "macro_counter";
    }
    if (
      event.type === "shot" &&
      (event.outcome === "wide" || event.outcome === "woodwork")
    ) {
      const through = state.recent.find(
        (past) =>
          past.type === "pass" &&
          past.kind === "through" &&
          seq - past.seq <= MACRO_NEAR_MISS_WINDOW,
      );
      if (through) {
        return "macro_near_miss";
      }
    }
  }

  if (beat === "turnover") {
    const duel = state.recent.find(
      (past) => past.type === "duel" && seq - past.seq <= PRESS_TURNOVER_WINDOW,
    );
    if (duel) {
      return "macro_press_turnover";
    }
  }

  if (event.type === "pass" && event.kind === "cross") {
    const switched = state.recent.find(
      (past) =>
        past.type === "pass" &&
        past.kind === "switch" &&
        seq - past.seq <= WIDE_SWITCH_WINDOW,
    );
    if (switched) {
      return "macro_wide_switch";
    }
  }

  if (isShotBeat(beat) && event.possessionTeamId) {
    const buildup = state.recent.filter(
      (past) =>
        seq - past.seq <= BOX_SIEGE_WINDOW &&
        (past.type === "pass" || past.type === "carry") &&
        past.possessionTeamId != null &&
        past.possessionTeamId === event.possessionTeamId &&
        attackingThird(past.ball.x, past.possessionTeamId, homeTeamId),
    );
    if (buildup.length >= 2) {
      return "macro_box_siege";
    }
  }

  return null;
}

function colorTemplate(
  seed: number,
  seq: number,
  macroId: MacroBeatId,
): string {
  const options = COLOR_LINES[macroId];
  const index = hashPick(seed, seq, macroId, options.length);
  return options[index]!;
}

export function createInitialDirectorState(): DirectorState {
  return {
    mode: "idle",
    attackTeamId: null,
    chainDepth: 0,
    cooldownColorUntilSeq: -1,
    lastBeatId: null,
    recent: [],
    pendingCounter: null,
    pendingSetPiece: null,
    storySlotsFired: new Set(),
    lastMomentSeq: -99,
    lastMomentBeat: null,
    lastFullLineSeq: -99,
  };
}

function allowsMacroColorOnBeat(beat: BroadcastBeatId): boolean {
  return (
    isShotBeat(beat) ||
    beat === "card_red" ||
    beat === "card_yellow" ||
    beat === "restart_penalty"
  );
}

function allowsStoryColorOnBeat(beat: BroadcastBeatId): boolean {
  return (
    allowsMacroColorOnBeat(beat) ||
    beat === "match_opening" ||
    beat === "second_half_open" ||
    beat === "full_time"
  );
}

function applyDirectorStateAfterBeat(
  state: DirectorState,
  beat: BroadcastBeatId,
  event: MatchEvent,
): void {
  if (isShotBeat(beat)) {
    state.pendingCounter = null;
    state.pendingSetPiece = null;
  }

  state.mode = updateMode(state.mode, beat);
  if (state.mode === "attack" && event.possessionTeamId) {
    if (state.attackTeamId === event.possessionTeamId) {
      state.chainDepth += 1;
    } else {
      state.attackTeamId = event.possessionTeamId;
      state.chainDepth = 1;
    }
  } else if (state.mode === "idle") {
    state.attackTeamId = null;
    state.chainDepth = 0;
  }
  state.lastBeatId = beat;
}

export function createBroadcastDirector(input: {
  seed: number;
  homeTeamId: TeamId;
  story?: BroadcastStoryContext;
}) {
  const seed = input.seed;
  const homeTeamId = input.homeTeamId;
  const story = input.story;
  let state = createInitialDirectorState();

  function emit(
    event: MatchEvent,
    previous: MatchEvent | undefined,
    ctx: CommentaryContext,
  ): DirectorEmittedLine[] {
    pushRecent(state, event);
    const beat = classifyBeat(event);
    const worthy = isCommentaryWorthy(event, previous, { homeTeamId });

    notePendingFromEvent(state, event, beat, homeTeamId);

    const macroId = detectMacro(state, event, beat, homeTeamId);
    const lines: DirectorEmittedLine[] = [];

    const emitChainFlush = (): void => {
      if (state.chainDepth < 3 || !state.attackTeamId) return;
      if (
        !attackingThird(event.ball.x, state.attackTeamId, homeTeamId)
      ) {
        return;
      }
      const teamLabel = ctx.teamName(state.attackTeamId);
      lines.push({
        seq: event.seq,
        beatId: beat,
        voice: "pbp",
        level: "full",
        text: `${formatClock(event.clock)}  ${chainFlushLine(seed, event.seq, teamLabel)}`,
        i18nKey: chainFlushI18nKey(seed, event.seq),
        i18nParams: { team: teamLabel },
      });
    };

    if (
      worthy &&
      CHAIN_BREAK_BEATS.has(beat) &&
      !isShotBeat(beat) &&
      beat !== "restart_penalty"
    ) {
      emitChainFlush();
    }

    if (worthy && shouldEmitMoment(beat)) {
      const duplicate =
        state.lastMomentBeat === beat &&
        event.seq - state.lastMomentSeq < MOMENT_DEDUPE_TICKS;
      if (!duplicate) {
        const key = momentI18nKey(beat);
        lines.push({
          seq: event.seq,
          beatId: beat,
          voice: "moment",
          level: beat === "restart_penalty" ? "key" : "extended",
          text: momentLineText(event, ctx, beat),
          i18nKey: key ?? undefined,
          i18nParams: momentI18nParams(event, ctx, beat),
        });
        state.lastMomentSeq = event.seq;
        state.lastMomentBeat = beat;
      }
    }

    const emitBuildupLine = (): void => {
      if (event.seq - state.lastFullLineSeq < FULL_LINE_MIN_SEQ_GAP) return;
      const copy = lineCopyI18n(event, ctx, seed);
      if (!copy) return;
      lines.push({
        seq: event.seq,
        beatId: beat,
        voice: "pbp",
        level: "full",
        text: `${formatClock(event.clock)}  ${commentate(event, ctx)}`,
        i18nKey: copy.key,
        i18nParams: copy.params,
      });
      state.lastFullLineSeq = event.seq;
    };

    if (worthy && CHAIN_BUFFER_BEATS.has(beat) && !isShotBeat(beat)) {
      if (BUILDUP_BEATS.has(beat)) emitBuildupLine();
      applyDirectorStateAfterBeat(state, beat, event);
      return lines;
    }

    if (worthy && BUILDUP_BEATS.has(beat) && !shouldEmitPlayByPlay(beat)) {
      emitBuildupLine();
    }

    if (worthy && shouldEmitPlayByPlay(beat)) {
      const deferGoalPbp = event.type === "shot" && event.outcome === "goal";
      if (!deferGoalPbp) {
        const pbpI18n = lineCopyI18n(event, ctx, seed) ?? commentaryI18n(event, ctx, beat);
        const prefix = isShotBeat(beat) ? shotLinePrefix(seed, event.seq, macroId) : "";
        const body = commentate(event, ctx);
        lines.push({
          seq: event.seq,
          beatId: beat,
          voice: "pbp",
          level: pbpLevel(beat, event, macroId, homeTeamId),
          text: `${formatClock(event.clock)}  ${prefix}${body}`,
          i18nKey: pbpI18n?.key,
          i18nParams: pbpI18n?.params,
        });
      }

      const allowMacroColor =
        allowsMacroColorOnBeat(beat) &&
        macroId !== null &&
        event.seq > state.cooldownColorUntilSeq &&
        (macroId !== "macro_box_siege" || isShotBeat(beat));

      if (allowMacroColor && macroId) {
        const variant = hashPick(seed, event.seq, macroId, COLOR_LINES[macroId].length);
        const macroI18n = macroCommentaryI18n(macroId, variant);
        lines.push({
          seq: event.seq,
          beatId: beat,
          voice: "color",
          level: "extended",
          macroId,
          text: `${formatClock(event.clock)}  ${colorTemplate(seed, event.seq, macroId)}`,
          i18nKey: macroI18n.key,
          i18nParams: macroI18n.params,
        });
        state.cooldownColorUntilSeq = event.seq + COLOR_COOLDOWN_TICKS;
      } else if (
        allowsStoryColorOnBeat(beat) &&
        event.seq > state.cooldownColorUntilSeq
      ) {
        const storyLine = pickStoryColorLine({
          beat,
          ctx: story,
          fired: state.storySlotsFired,
          seed,
          seq: event.seq,
        });
        if (storyLine) {
          lines.push({
            seq: event.seq,
            beatId: beat,
            voice: "color",
            level: "extended",
            storySlot: storyLine.slot,
            text: `${formatClock(event.clock)}  ${storyLine.text}`,
          });
          state.storySlotsFired.add(storyLine.slot);
          state.cooldownColorUntilSeq = event.seq + COLOR_COOLDOWN_TICKS;
        }
      }
    }

    applyDirectorStateAfterBeat(state, beat, event);

    return lines;
  }

  function snapshot(): DirectorState {
    return { ...state, recent: [...state.recent] };
  }

  return { emit, snapshot };
}
