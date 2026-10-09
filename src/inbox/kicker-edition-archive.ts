import type { TreterEdition } from "../media/kicker-digest.ts";

export const MAX_KICKER_EDITION_ARCHIVE = 40;

export function archiveKickerEdition(
  archive: readonly TreterEdition[],
  edition: TreterEdition,
): TreterEdition[] {
  const without = archive.filter(
    (entry) => !(entry.season === edition.season && entry.week === edition.week),
  );
  return [edition, ...without].slice(0, MAX_KICKER_EDITION_ARCHIVE);
}

export function kickerEditionFromArchive(
  archive: readonly TreterEdition[],
  season: number,
  week: number,
): TreterEdition | null {
  return archive.find((entry) => entry.season === season && entry.week === week) ?? null;
}

export function sessionKickerEditionLookup(
  archive: readonly TreterEdition[],
  current: TreterEdition | null | undefined,
  season: number,
  week: number,
): TreterEdition | null {
  const stored = kickerEditionFromArchive(archive, season, week);
  if (stored) return stored;
  if (current && current.season === season && current.week === week) return current;
  return null;
}
