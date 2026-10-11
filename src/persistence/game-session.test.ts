import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialTrainingPlan } from "../development/training-units.ts";
import { act1AssistantTrainingPlan } from "../narrative/career-presentation.ts";
import { MONDAY } from "../sim/day-calendar.ts";
import { assignScout, reconcileScoutBoard } from "../scouting/scout-board.ts";
import { addPlayersToPool, ensureTargetsForPool, normalizeDiscovery } from "../scouting/scout-discovery.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { loadDemoRoster } from "../ui/demo-roster.ts";
import { refreshPlayerMarketValue } from "../transfers/refresh-market-values.ts";
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
    const firstRivalId = session.rivalPlayers[0]!.id;
    const discovery = addPlayersToPool(normalizeDiscovery(session.scoutBoard.discovery), [
      firstRivalId,
    ]);
    const scoutBase = reconcileScoutBoard(
      {
        ...session.scoutBoard,
        discovery,
        targets: ensureTargetsForPool(session.scoutBoard.targets, discovery, session.rivalPlayers),
      },
      session.rivalPlayers,
    );
    const board = assignScout(scoutBase, firstRivalId, session.scoutNetwork);
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

  it("writes a renamed manager onto an existing save", () => {
    const session = newGameSession(new Date("2026-09-22T14:00:00Z"));
    const base = saveFromSession(session);
    expect(base.manifest.manager_name).toBe("Jan");
    const renamed = saveFromSession({ ...session, managerName: "Kim" }, base);
    expect(renamed.manifest.manager_name).toBe("Kim");
    expect(sessionFromSave(renamed).managerName).toBe("Kim");
  });

  it("persists to localStorage and reloads with pipeline state", () => {
    removeLocalSave(1);
    const session = newGameSession();
    persistSession(session, 1);
    const loaded = loadLocalSave(1);
    expect(sessionFromSave(loaded!).scoutBoard).toEqual(session.scoutBoard);
    expect(loaded?.state.pipeline?.youth_inbox.queue.length).toBeGreaterThan(0);
    expect(loaded?.state.world?.generation_version).toBe(1);
    expect(sessionFromSave(loaded!)).toMatchObject({
      week: session.week,
      season: session.season,
      clubId: session.clubId,
    });
    removeLocalSave(1);
  });

  it("rejects a v1 save without pipeline state (PRD 08.10)", () => {
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
    expect(() => loadLocalSave(1)).toThrow();
    removeLocalSave(1);
  });

  it("keeps training calendar gate true across save round-trips", () => {
    const session = {
      ...newGameSession(new Date("2026-09-22T14:00:00Z")),
      weekday: MONDAY,
      trainingCalendarGateDone: true,
      trainingUnitsCompleted: 0,
    };
    const loaded = sessionFromSave(saveFromSession(session));
    expect(loaded.trainingCalendarGateDone).toBe(true);
  });

  it("drops legacy assistant default plan when manual training is active", () => {
    const session = newGameSession(new Date("2026-09-22T14:00:00Z"));
    const withAssistant = {
      ...session,
      trainingPlan: act1AssistantTrainingPlan(),
    };
    const loaded = sessionFromSave(saveFromSession(withAssistant));
    expect(loaded.trainingPlan.every((slot) => slot.unitId === "")).toBe(true);
  });

  it("recomputes stale market_value when hydrating from save", () => {
    const session = newGameSession(new Date("2026-09-22T14:00:00Z"));
    const youth = clonePlayer();
    youth.age = 15;
    youth.squad_status = "u17";
    youth.market_value = 372_000;
    youth.attributes = {
      ...youth.attributes,
      shooting: 92,
      passing: 92,
      dribbling: 92,
      technique: 92,
      pace: 92,
    };
    const save = saveFromSession({ ...session, players: [youth] });
    save.players[0]!.market_value = 372_000;
    const loaded = sessionFromSave(save);
    const expected = refreshPlayerMarketValue(youth, save.state.season).market_value;
    expect(loaded.players[0]!.market_value).toBe(expected);
    expect(loaded.players[0]!.market_value).toBeGreaterThan(800_000);
  });

  it("keeps open purchase negotiations through sessionFromSave", () => {
    const session = newGameSession(new Date("2026-09-22T14:00:00Z"));
    const loaded = sessionFromSave(
      saveFromSession({
        ...session,
        transferState: {
          ...session.transferState,
          negotiations: [
            {
              id: "neg_keep",
              player_id: "pl_keep",
              seller_club_id: "cl_rival",
              asking_price: 400_000,
              current_offer: 0,
              round: 1,
              patience_rounds_left: 3,
              status: "active",
              failed_lowball_count: 0,
              last_reaction: null,
              week: session.week,
            },
          ],
        },
      }),
    );
    expect(loaded.transferState.negotiations).toHaveLength(1);
    expect(loaded.transferState.negotiations?.[0]?.player_id).toBe("pl_keep");
  });
});
