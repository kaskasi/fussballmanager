import Fastify from "fastify";
import { buildMatchView, parseMatchBody, parseViewSeed } from "./api/match-view.ts";

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

  return app;
}
