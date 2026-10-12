import type { GameSession } from "../persistence/game-session.ts";
import { buildTreterEdition, type TreterEdition } from "../media/kicker-digest.ts";
import { formatTreterTickerLine } from "../i18n/treter-display.ts";

export function compareTreterEditionRecency(a: TreterEdition, b: TreterEdition): number {
  if (a.season !== b.season) return b.season - a.season;
  return b.week - a.week;
}

/** Latest Treter with articles — current edition, then archive, then rebuild from session. */
export function hubLatestTreterEdition(input: {
  current?: TreterEdition | null;
  archive?: readonly TreterEdition[];
  session?: GameSession | null;
}): TreterEdition | null {
  const { current, archive = [], session } = input;
  if (current && current.articles.length > 0) return current;

  const fromArchive = [...archive].sort(compareTreterEditionRecency).find((e) => e.articles.length > 0);
  if (fromArchive) return fromArchive;

  if (session) {
    const built = buildTreterEdition(session);
    if (built.articles.length > 0) return built;
  }
  return null;
}

export function treterTickerLines(edition: TreterEdition): string[] {
  return edition.articles.map((article) => formatTreterTickerLine(article));
}
