import type { BroadcastStoryContext } from "@fussballmanager/shared";
import type { BroadcastBeatId } from "./beats.ts";

/** Align with PRD 13 / season-objectives (18-team league). */
const RELEGATION_ZONE_PLACE = 16;

export type StorySlotId =
  | "table_pressure"
  | "relegation_beat"
  | "fan_mood"
  | "derby"
  | "chronicle_ref";

const STRUCTURAL_BEATS = new Set<BroadcastBeatId>([
  "match_opening",
  "second_half_open",
  "half_time",
  "full_time",
]);

export function storyBeatAllowsSlot(beat: BroadcastBeatId): boolean {
  return STRUCTURAL_BEATS.has(beat);
}

function hashPick(seed: number, seq: number, slot: StorySlotId, variants: number): number {
  let hash = seed ^ seq;
  for (const ch of slot) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return (hash >>> 0) % variants;
}

function paraphraseFan(head: { speaker: string; message: string }): string {
  const msg = head.message.trim();
  if (msg.length <= 72) {
    return `${head.speaker}: ${msg}`;
  }
  return `${head.speaker}: ${msg.slice(0, 69)}…`;
}

function factDerby(ctx: BroadcastStoryContext): boolean {
  return ctx.isDerby === true && Boolean(ctx.opponentShortName);
}

function factRelegation(ctx: BroadcastStoryContext): boolean {
  if (ctx.activeArc !== "relegation_battle") return false;
  const table = ctx.playerTable;
  if (!table) return false;
  return table.place >= RELEGATION_ZONE_PLACE;
}

function factTablePressure(ctx: BroadcastStoryContext): boolean {
  const table = ctx.playerTable;
  if (!table) return false;
  return table.place >= RELEGATION_ZONE_PLACE - 1;
}

function factFanMood(ctx: BroadcastStoryContext): boolean {
  const head = ctx.fanFeedHead;
  return Boolean(head?.message.trim() && head?.speaker.trim());
}

function factChronicle(ctx: BroadcastStoryContext): boolean {
  return Boolean(ctx.chronicleHead?.title.trim());
}

const SLOT_ORDER: StorySlotId[] = [
  "derby",
  "relegation_beat",
  "table_pressure",
  "fan_mood",
  "chronicle_ref",
];

const SLOT_LINES: Record<StorySlotId, readonly string[]> = {
  derby: [
    "Derby-Tag — die Kurve erwartet mehr als drei Punkte.",
    "Lokalderby: Emotionen hoch, Fehler haben Gewicht.",
  ],
  relegation_beat: [
    "Jeder Punkt zählt in dieser Tabellensituation.",
    "Unten im Tableau — heute kein Spiel zum Wegsehen.",
  ],
  table_pressure: [
    "Sie brauchen Punkte — der Abstand ist dünn.",
    "Die Tabelle drückt: heute zählt Ergebnis vor Show.",
  ],
  fan_mood: [],
  chronicle_ref: [
    "Die letzten Wochen hallen nach — heute kann die Story kippen.",
    "Was zuletzt passierte, bleibt im Hinterkopf.",
  ],
};

function slotText(
  slot: StorySlotId,
  ctx: BroadcastStoryContext,
  seed: number,
  seq: number,
): string {
  if (slot === "fan_mood" && ctx.fanFeedHead) {
    return paraphraseFan(ctx.fanFeedHead);
  }
  if (slot === "chronicle_ref" && ctx.chronicleHead) {
    const title = ctx.chronicleHead.title.trim();
    const variants = [`Zuletzt: ${title}.`, `Im Vereinsgedächtnis: ${title}.`];
    return variants[hashPick(seed, seq, slot, variants.length)]!;
  }
  if (slot === "derby" && ctx.opponentShortName) {
    const variants = [
      `Derby gegen ${ctx.opponentShortName} — die Stadt hört zu.`,
      `${ctx.opponentShortName} im Fokus: mehr als ein normales Spiel.`,
    ];
    return variants[hashPick(seed, seq, slot, variants.length)]!;
  }
  const options = SLOT_LINES[slot];
  const index = hashPick(seed, seq, slot, options.length);
  return options[index]!;
}

function slotAllowed(slot: StorySlotId, ctx: BroadcastStoryContext): boolean {
  switch (slot) {
    case "derby":
      return factDerby(ctx);
    case "relegation_beat":
      return factRelegation(ctx);
    case "table_pressure":
      return factTablePressure(ctx);
    case "fan_mood":
      return factFanMood(ctx);
    case "chronicle_ref":
      return factChronicle(ctx);
    default:
      return false;
  }
}

export function pickStoryColorLine(input: {
  beat: BroadcastBeatId;
  ctx: BroadcastStoryContext | undefined;
  fired: ReadonlySet<StorySlotId>;
  seed: number;
  seq: number;
}): { slot: StorySlotId; text: string } | null {
  const { beat, ctx, fired, seed, seq } = input;
  if (!ctx || !storyBeatAllowsSlot(beat)) {
    return null;
  }
  for (const slot of SLOT_ORDER) {
    if (fired.has(slot) || !slotAllowed(slot, ctx)) {
      continue;
    }
    const text = slotText(slot, ctx, seed, seq);
    if (!text.trim()) {
      continue;
    }
    return { slot, text };
  }
  return null;
}
