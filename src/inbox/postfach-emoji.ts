/**
 * Postfach-only emoji helpers (design.md §4.2).
 * Do not use outside DecisionInbox / Postfach archive / hub mail column.
 */

const LEADING_EMOJI = /^(\p{Extended_Pictographic})\s+/u;

export function splitInboxEmojiPrefix(text: string): { emoji: string | null; body: string } {
  const trimmed = text.trimStart();
  const match = trimmed.match(LEADING_EMOJI);
  if (!match) return { emoji: null, body: text };
  return { emoji: match[1]!, body: trimmed.slice(match[0].length) };
}

/** Prefix for generated Postfach club-event lines (transfer teasers, stamp news). */
export function inboxEmojiLine(emoji: string, text: string): string {
  return `${emoji} ${text.trim()}`;
}
