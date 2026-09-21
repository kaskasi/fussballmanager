CREATE TABLE IF NOT EXISTS divisions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  division_id TEXT NOT NULL REFERENCES divisions (id),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  tactics JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs (id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  form INTEGER NOT NULL,
  fatigue INTEGER NOT NULL,
  attributes JSONB NOT NULL,
  is_starter BOOLEAN NOT NULL,
  slot TEXT,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  division_id TEXT NOT NULL REFERENCES divisions (id),
  home_club_id TEXT NOT NULL REFERENCES clubs (id),
  away_club_id TEXT NOT NULL REFERENCES clubs (id),
  seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_goals INTEGER,
  away_goals INTEGER,
  played_at TIMESTAMPTZ,
  events JSONB
);
