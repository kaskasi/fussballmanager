import { Hono } from "hono";

type Bindings = {
  ASSETS: Fetcher;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

/** Production: static SPA only. Match engine runs in the browser (PRD 17). */
const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, runtime: "cloudflare-worker", matchEngine: "client" }),
);
app.get("/api/health", (c) =>
  c.json({ ok: true, runtime: "cloudflare-worker", matchEngine: "client" }),
);

/** Public client config. Anon key is meant for the browser; service role stays server-side. */
app.get("/api/client-config", (c) => {
  const supabaseUrl = c.env.SUPABASE_URL?.trim() || null;
  const supabaseAnonKey = c.env.SUPABASE_ANON_KEY?.trim() || null;
  return c.json({ supabaseUrl, supabaseAnonKey });
});

export default app;
