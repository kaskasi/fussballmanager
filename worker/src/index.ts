import { Hono } from "hono";

type Bindings = {
  ASSETS: Fetcher;
};

/** Production: static SPA only. Match engine runs in the browser (PRD 17). */
const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, runtime: "cloudflare-worker", matchEngine: "client" }),
);
app.get("/api/health", (c) =>
  c.json({ ok: true, runtime: "cloudflare-worker", matchEngine: "client" }),
);

export default app;
