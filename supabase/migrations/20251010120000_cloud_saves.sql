-- PRD 18 — M1 cloud save (latest blob per sync code hash)

CREATE TABLE IF NOT EXISTS public.cloud_saves (
  sync_code_hash TEXT PRIMARY KEY,
  blob BYTEA NOT NULL,
  save_version INT NOT NULL,
  last_played TIMESTAMPTZ,
  display_name TEXT,
  byte_size INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_saves_updated_at_idx ON public.cloud_saves (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.cloud_save_rate (
  sync_code_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (sync_code_hash, window_start)
);

ALTER TABLE public.cloud_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_save_rate ENABLE ROW LEVEL SECURITY;

-- No public policies: Edge Function uses service role only.
