import type { ClubEvent } from "../inbox/club-events.ts";
import type { SaveGame } from "./savegame-model.ts";

/** Max rows kept in cloud blobs (PRD 18 — latest-only retention at row level). */
export const MAX_CLOUD_HISTORY_ENTRIES = 200;
export const MAX_CLOUD_CHRONICLE_ENTRIES = 120;
export const MAX_CLOUD_CLUB_EVENTS = 80;

/** Local browser checkpoint — higher caps than cloud (PRD 18 compact). */
export const MAX_LOCAL_HISTORY_ENTRIES = MAX_CLOUD_HISTORY_ENTRIES * 2;
export const MAX_LOCAL_CHRONICLE_ENTRIES = MAX_CLOUD_CHRONICLE_ENTRIES * 2;
export const MAX_LOCAL_CLUB_EVENTS = MAX_CLOUD_CLUB_EVENTS * 2;

function tail<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  return items.slice(items.length - max);
}

function compactWithLimits(
  save: SaveGame,
  limits: { history: number; chronicle: number; clubEvents: number },
): SaveGame {
  const pipeline = save.state.pipeline;
  const clubEvents = pipeline?.club_events ?? [];
  const trimmedEvents = tail(clubEvents as ClubEvent[], limits.clubEvents);

  return {
    ...save,
    history: tail(save.history, limits.history),
    chronicle: tail(save.chronicle, limits.chronicle),
    state: pipeline
      ? {
          ...save.state,
          pipeline: {
            ...pipeline,
            club_events: trimmedEvents,
          },
        }
      : save.state,
  };
}

/** Smaller JSON for cloud upload; local saves stay full fidelity in memory until persist. */
export function compactSaveForCloudBlob(save: SaveGame): SaveGame {
  return compactWithLimits(save, {
    history: MAX_CLOUD_HISTORY_ENTRIES,
    chronicle: MAX_CLOUD_CHRONICLE_ENTRIES,
    clubEvents: MAX_CLOUD_CLUB_EVENTS,
  });
}

/** Trim append-only logs before writing to browser storage (export/import stay full in-memory). */
export function compactSaveForLocalPersist(save: SaveGame): SaveGame {
  return compactWithLimits(save, {
    history: MAX_LOCAL_HISTORY_ENTRIES,
    chronicle: MAX_LOCAL_CHRONICLE_ENTRIES,
    clubEvents: MAX_LOCAL_CLUB_EVENTS,
  });
}
