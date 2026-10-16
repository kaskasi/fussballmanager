-- Player notes from Settings. Written only by the player-feedback edge function (service role).

create table if not exists public.player_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body text not null check (char_length(body) between 1 and 4000),
  save_version integer,
  season integer,
  week integer,
  screen text,
  locale text,
  device_id text
);

alter table public.player_feedback enable row level security;
