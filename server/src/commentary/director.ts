import type { BroadcastStoryContext, MatchEvent, TeamId } from "@fussballmanager/shared";
import { beatForCommentary, type BroadcastBeatId } from "./beats.ts";
import type { CommentaryContext } from "./render.ts";
import { commentaryI18n, macroCommentaryI18n } from "./i18n-keys.ts";
import { commentateLine, formatClock } from "./render.ts";
import { shouldEmitPlayByPlay } from "./suppression.ts";
import { pickStoryColorLine, type StorySlotId } from "./story-slots.ts";

export type MacroBeatId =
  | "macro_press_turnover"
  | "macro_wide_switch"
  | "macro_box_siege"
  | "macro_counter"
  | "macro_set_piece_threat"
  | "macro_near_miss";

export type DirectorMode = "idle" | "set_piece" | "attack" | "stoppage";

export type DirectorEmittedLine = {
  seq: number;
  beatId: BroadcastBeatId;
  voice: "pbp" | "color";
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
};

const RECENT_MAX = 12;
const COLOR_COOLDOWN_TICKS = 8;
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

function attackingThird(x: number, teamId: TeamId, homeTeamId: TeamId): boolean {
  return teamId === homeTeamId ? x > 66.67 : x < 33.34;
}

function defensiveThird(x: number, teamId: TeamId, homeTeamId: TeamId): boolean {
  return teamId === homeTeamId ? x < 33.34 : x > 66.67;
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
  };
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
    const beat = beatForCommentary(event, previous);
    if (!beat) {
      return [];
    }

    notePendingFromEvent(state, event, beat, homeTeamId);

    const macroId = detectMacro(state, event, beat, homeTeamId);

    if (!shouldEmitPlayByPlay(beat)) {
      applyDirectorStateAfterBeat(state, beat, event);
      return [];
    }

    const pbpI18n = commentaryI18n(event, ctx, beat);
    const lines: DirectorEmittedLine[] = [
      {
        seq: event.seq,
        beatId: beat,
        voice: "pbp",
        text: commentateLine(event, ctx),
        i18nKey: pbpI18n?.key,
        i18nParams: pbpI18n?.params,
      },
    ];

    const allowColor =
      macroId !== null &&
      event.seq > state.cooldownColorUntilSeq &&
      (macroId !== "macro_box_siege" || isShotBeat(beat));

    if (allowColor && macroId) {
      const variant = hashPick(seed, event.seq, macroId, COLOR_LINES[macroId].length);
      const macroI18n = macroCommentaryI18n(macroId, variant);
      lines.push({
        seq: event.seq,
        beatId: beat,
        voice: "color",
        macroId,
        text: `${formatClock(event.clock)}  ${colorTemplate(seed, event.seq, macroId)}`,
        i18nKey: macroI18n.key,
        i18nParams: macroI18n.params,
      });
      state.cooldownColorUntilSeq = event.seq + COLOR_COOLDOWN_TICKS;
    } else if (event.seq > state.cooldownColorUntilSeq) {
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
          storySlot: storyLine.slot,
          text: `${formatClock(event.clock)}  ${storyLine.text}`,
        });
        state.storySlotsFired.add(storyLine.slot);
        state.cooldownColorUntilSeq = event.seq + COLOR_COOLDOWN_TICKS;
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
