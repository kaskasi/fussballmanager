import { describe, expect, it } from "vitest";
import { createSave, SAVE_VERSION } from "./savegame-model.ts";
import { compactSaveForCloudBlob, MAX_CLOUD_HISTORY_ENTRIES } from "./save-compact.ts";

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
