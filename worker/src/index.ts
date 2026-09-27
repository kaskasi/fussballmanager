import { Hono } from "hono";
import { parseCareerMatchBody, runCareerMatch } from "../../server/src/api/career-match.ts";
import { parseMatchdayBody, runMatchday } from "../../server/src/api/matchday.ts";
import { buildMatchView, parseMatchBody, parseViewSeed } from "../../server/src/api/match-view.ts";

type Bindings = {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ ok: true, phase: 1, runtime: "cloudflare-worker" }));
app.get("/api/health", (c) => c.json({ ok: true, phase: 1, runtime: "cloudflare-worker" }));

app.get("/api/match", (c) => {
  const seed = parseViewSeed(c.req.query("seed"));
  return c.json(buildMatchView({ seed }));
});

app.post("/api/match", async (c) => {
  const body = await c.req.json();
  return c.json(buildMatchView(parseMatchBody(body)));
});

app.post("/api/career-match", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(runCareerMatch(parseCareerMatchBody(body)));
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Invalid career match request" },
      400,
    );
  }
});

app.post("/api/matchday", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(runMatchday(parseMatchdayBody(body)));
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Invalid matchday request" },
      400,
    );
  }
});

export default app;
