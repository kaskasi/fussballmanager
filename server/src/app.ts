import Fastify from "fastify";
import { parseCareerMatchBody, runCareerMatch } from "./api/career-match.ts";
import { parseMatchdayBody, runMatchday } from "./api/matchday.ts";
import { buildMatchView, parseMatchBody, parseViewSeed } from "./api/match-view.ts";
import { deleteFolderSave, newFolderSave, readFolderSave, writeFolderSave } from "./api/savegame.ts";
import type { SaveGame } from "../../src/persistence/savegame-model.ts";

export function buildApp(logger = false) {
  const app = Fastify({ logger });

  app.get("/health", async () => ({ ok: true, phase: 1 }));
  app.get("/api/health", async () => ({ ok: true, phase: 1 }));

  app.get("/api/match", async (request) => {
    const query = request.query as { seed?: string };
    return buildMatchView({ seed: parseViewSeed(query.seed) });
  });

  app.post("/api/match", async (request) => {
    const parsed = parseMatchBody(request.body);
    return buildMatchView(parsed);
  });

  app.post("/api/career-match", async (request, reply) => {
    try {
      return runCareerMatch(parseCareerMatchBody(request.body));
    } catch (error) {
      reply.code(400);
      return { error: error instanceof Error ? error.message : "Invalid career match request" };
    }
  });

  app.post("/api/matchday", async (request, reply) => {
    try {
      return runMatchday(parseMatchdayBody(request.body));
    } catch (error) {
      reply.code(400);
      return { error: error instanceof Error ? error.message : "Invalid matchday request" };
    }
  });

  app.get("/api/save/:name/:slot", async (request, reply) => {
    const params = request.params as { name: string; slot: string };
    const slot = Number(params.slot);
    try {
      return await readFolderSave(params.name, slot);
    } catch (error) {
      reply.code(404);
      return { error: error instanceof Error ? error.message : "Save not found" };
    }
  });

  app.put("/api/save/:name/:slot", async (request, reply) => {
    const params = request.params as { name: string; slot: string };
    const body = request.body as SaveGame & { weekend?: boolean; simulating?: boolean };
    const slot = Number(params.slot);
    try {
      await writeFolderSave(params.name, slot, body, {
        weekend: body.weekend ?? true,
        simulating: body.simulating ?? false,
      });
      return { ok: true };
    } catch (error) {
      reply.code(400);
      return { error: error instanceof Error ? error.message : "Save refused" };
    }
  });

  app.delete("/api/save/:name/:slot", async (request, reply) => {
    const params = request.params as { name: string; slot: string };
    const slot = Number(params.slot);
    try {
      await deleteFolderSave(params.name, slot);
      return { ok: true };
    } catch (error) {
      reply.code(400);
      return { error: error instanceof Error ? error.message : "Delete failed" };
    }
  });

  app.post("/api/save/new", async (request) => {
    const body = request.body as {
      playerClubId: string;
      managerName: string;
      season: number;
      week: number;
      masterSeed: number;
      players?: SaveGame["players"];
    };
    return newFolderSave({
      nowIso: new Date().toISOString(),
      playerClubId: body.playerClubId,
      managerName: body.managerName,
      season: body.season,
      week: body.week,
      masterSeed: body.masterSeed,
      players: body.players,
    });
  });

  return app;
}
