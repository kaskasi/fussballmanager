import type { ClubEvent } from "../inbox/club-events.ts";
import type { SaveGame } from "./savegame-model.ts";

/** Max rows kept in cloud blobs (PRD 18 — latest-only retention at row level). */
export const MAX_CLOUD_HISTORY_ENTRIES = 200;
export const MAX_CLOUD_CHRONICLE_ENTRIES = 120;
export const MAX_CLOUD_CLUB_EVENTS = 80;

function tail<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  return items.slice(items.length - max);
}

/** Smaller JSON for cloud upload; local saves stay full fidelity. */
export function compactSaveForCloudBlob(save: SaveGame): SaveGame {
  const pipeline = save.state.pipeline;
  const clubEvents = pipeline?.club_events ?? [];
  const trimmedEvents = tail(clubEvents as ClubEvent[], MAX_CLOUD_CLUB_EVENTS);

  return {
    ...save,
    history: tail(save.history, MAX_CLOUD_HISTORY_ENTRIES),
    chronicle: tail(save.chronicle, MAX_CLOUD_CHRONICLE_ENTRIES),
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
