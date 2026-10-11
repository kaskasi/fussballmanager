import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newGameSession, saveFromSession } from "./game-session.ts";
import { normalizeSave } from "./local-save.ts";
import { SaveVersionMismatchError, SAVE_VERSION } from "./savegame-model.ts";

describe("normalizeSave (PRD 08.10)", () => {
  it("accepts current save_version", () => {
    const save = saveFromSession(newGameSession());
    expect(save.manifest.save_version).toBe(SAVE_VERSION);
    expect(normalizeSave(save).manifest.save_version).toBe(SAVE_VERSION);
  });

  it("rejects save_version below current", () => {
    const save = saveFromSession(newGameSession());
    save.manifest.save_version = 1;
    expect(() => normalizeSave(save)).toThrow(SaveVersionMismatchError);
    try {
      normalizeSave(save);
    } catch (error) {
      expect(error).toMatchObject({ kind: "too_old", foundVersion: 1 });
    }
  });

  it("rejects save_version above current", () => {
    const save = saveFromSession(newGameSession());
    save.manifest.save_version = SAVE_VERSION + 1;
    expect(() => normalizeSave(save)).toThrow(SaveVersionMismatchError);
    try {
      normalizeSave(save);
    } catch (error) {
      expect(error).toMatchObject({ kind: "too_new", foundVersion: SAVE_VERSION + 1 });
    }
  });
});
