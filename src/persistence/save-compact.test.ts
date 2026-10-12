import { describe, expect, it } from "vitest";
import { createSave, SAVE_VERSION } from "./savegame-model.ts";
import {
  compactSaveForCloudBlob,
  compactSaveForLocalPersist,
  MAX_CLOUD_HISTORY_ENTRIES,
  MAX_LOCAL_HISTORY_ENTRIES,
} from "./save-compact.ts";

describe("compactSaveForCloudBlob", () => {
  it("trims history tail", () => {
    const base = createSave({
      nowIso: new Date().toISOString(),
      playerClubId: "club",
      managerName: "Test",
      season: 1,
      week: 1,
      masterSeed: 1,
    });
    const save = {
      ...base,
      history: Array.from({ length: MAX_CLOUD_HISTORY_ENTRIES + 50 }, (_, i) => ({ i })),
    };
    const compact = compactSaveForCloudBlob(save);
    expect(compact.history).toHaveLength(MAX_CLOUD_HISTORY_ENTRIES);
    expect((compact.history[0] as { i: number }).i).toBe(50);
    expect(compact.manifest.save_version).toBe(SAVE_VERSION);
  });
});

describe("compactSaveForLocalPersist", () => {
  it("keeps more history rows than cloud compact", () => {
    const base = createSave({
      nowIso: new Date().toISOString(),
      playerClubId: "club",
      managerName: "Test",
      season: 1,
      week: 1,
      masterSeed: 1,
    });
    const len = MAX_LOCAL_HISTORY_ENTRIES + 20;
    const save = {
      ...base,
      history: Array.from({ length: len }, (_, i) => ({ i })),
    };
    const local = compactSaveForLocalPersist(save);
    const cloud = compactSaveForCloudBlob(save);
    expect(local.history.length).toBe(MAX_LOCAL_HISTORY_ENTRIES);
    expect(cloud.history.length).toBeLessThan(local.history.length);
  });
});
