export type MacroBeatId =
  | "macro_press_turnover"
  | "macro_wide_switch"
  | "macro_box_siege"
  | "macro_counter"
  | "macro_set_piece_threat"
  | "macro_near_miss";

const CHAIN_FLUSH: readonly string[] = [
  "Der Druck bleibt — {team} setzt nach.",
  "Lange Phase im Angriffsdrittel.",
  "Die Gäste bekommen den Ball nicht weg.",
];

const MACRO_SHOT_PREFIX: Record<MacroBeatId, readonly string[]> = {
  macro_press_turnover: ["Ballgewinn, sofort Tempo — "],
  macro_wide_switch: ["Seitenwechsel, dann "],
  macro_box_siege: ["Dauerdruck — "],
  macro_counter: ["Konter — "],
  macro_set_piece_threat: ["Aus dem Standard — "],
  macro_near_miss: ["Große Chance — "],
};

export function hashPickVariant(seed: number, seq: number, salt: string, variants: number): number {
  let hash = seed ^ seq;
  for (const ch of salt) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return (hash >>> 0) % variants;
}

export function chainFlushLine(seed: number, seq: number, teamLabel: string): string {
  const index = hashPickVariant(seed, seq, "chain-flush", CHAIN_FLUSH.length);
  return CHAIN_FLUSH[index]!.replace("{team}", teamLabel);
}

/** Same variant as `chainFlushLine`, as a locale key (`match.chain.flush.<n>`). */
export function chainFlushI18nKey(seed: number, seq: number): string {
  return `match.chain.flush.${hashPickVariant(seed, seq, "chain-flush", CHAIN_FLUSH.length)}`;
}

export function shotLinePrefix(seed: number, seq: number, macroId: MacroBeatId | null): string {
  if (!macroId) return "";
  const options = MACRO_SHOT_PREFIX[macroId];
  if (!options?.length) return "";
  const index = hashPickVariant(seed, seq, macroId, options.length);
  return options[index] ?? "";
}
