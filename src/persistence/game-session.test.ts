import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialTrainingPlan } from "../development/training-units.ts";
import { assignScout, createScoutBoard } from "../scouting/scout-board.ts";
import { loadDemoRoster } from "../ui/demo-roster.ts";
import { newGameSession, saveFromSession, sessionFromSave } from "./game-session.ts";
import { loadLocalSave, persistSession, removeLocalSave, writeLocalSave } from "./local-save.ts";
import { createSave, SAVE_VERSION } from "./savegame.ts";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("game session", () => {
  it("round-trips hub state through a save", () => {
    const session = newGameSession(new Date("2026-09-22T14:00:00Z"));
    const board = assignScout(session.scoutBoard, Object.keys(session.scoutBoard.targets)[0]!);
    const plan = createInitialTrainingPlan().map((slot, index) =>
      index === 0 ? { ...slot, focus: true } : slot,
    );
    const updated = {
      ...session,
      week: 35,
      scoutBoard: board,
      trainingPlan: plan,
    };
    const save = saveFromSession(updated);
    const loaded = sessionFromSave(save);
    expect(loaded.week).toBe(35);
    expect(loaded.trainingPlan[0]?.focus).toBe(true);
    expect(loaded.scoutBoard).toEqual(board);
    expect(save.state.pipeline?.training_plan).toEqual(plan);
    expect(save.state.pipeline?.youth_inbox).toEqual(updated.youthInbox);
    expect(save.state.world).toEqual(session.world);
    expect(loaded.world.generation_version).toBe(1);
    expect(loaded.world.clubs).toHaveLength(36);
    expect(save.manifest.save_version).toBe(SAVE_VERSION);
  });

  it("persists to localStorage and reloads with pipeline state", () => {
    removeLocalSave(1);
    const session = newGameSession();
    persistSession(session, 1);
    const loaded = loadLocalSave(1);
    expect(loaded?.state.pipeline?.scout_board).toEqual(createScoutBoard());
    expect(loaded?.state.pipeline?.youth_inbox.queue.length).toBeGreaterThan(0);
    expect(loaded?.state.world?.generation_version).toBe(1);
    expect(sessionFromSave(loaded!)).toMatchObject({
      week: session.week,
      season: session.season,
      clubId: session.clubId,
    });
    removeLocalSave(1);
  });

  it("migrates a v1 save without pipeline state", () => {
    removeLocalSave(1);
    const legacy = createSave({
      nowIso: "2026-09-22T14:00:00Z",
      playerClubId: "cl_fc_nordstern",
      managerName: "Jan",
      season: 1,
      week: 34,
      masterSeed: 2026,
      players: loadDemoRoster(),
    });
    legacy.manifest.save_version = 1;
    legacy.manifest.migrations_applied = [];
    delete legacy.state.pipeline;
    writeLocalSave(1, legacy);
    const loaded = loadLocalSave(1);
    expect(loaded?.manifest.save_version).toBe(SAVE_VERSION);
    expect(loaded?.state.pipeline?.training_plan).toHaveLength(5);
    expect(loaded?.state.pipeline?.youth_inbox.queue.length).toBeGreaterThan(0);
    expect(loaded?.state.world).toMatchObject({
      generation_version: 0,
      world_seed: 2026,
      clubs: [],
    });
    removeLocalSave(1);
  });
});
