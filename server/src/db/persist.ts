import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  asMatchId,
  SEED_MATCHUP,
  type MatchEvent,
  type PlayerAttributes,
  type Squad,
  type TeamTactics,
} from "@fussballmanager/shared";
import { createInitialState, simulate } from "../engine/index.ts";
import { resolveDatabaseUrl } from "./config.ts";
import {
  DEFAULT_MATCH_ID,
  DIVISION_ID,
  DIVISION_NAME,
  recordsFromSquad,
  squadFromRecords,
  type ClubRecord,
  type PlayerRecord,
} from "./squad-map.ts";

const { Pool } = pg;

export type PlayedFixture = {
  matchId: string;
  seed: number;
  homeGoals: number;
  awayGoals: number;
  eventCount: number;
};

export function createPool(connectionString = resolveDatabaseUrl()): pg.Pool {
  return new Pool({ connectionString });
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  await pool.query(readFileSync(schemaPath, "utf8"));
}

export async function seedDivision(pool: pg.Pool): Promise<void> {
  await pool.query(
    `INSERT INTO divisions (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [DIVISION_ID, DIVISION_NAME],
  );
  for (const squad of [SEED_MATCHUP.home, SEED_MATCHUP.away]) {
    const { club, players } = recordsFromSquad(squad);
    await pool.query(
      `INSERT INTO clubs (id, division_id, name, short_name, tactics)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         division_id = EXCLUDED.division_id,
         name = EXCLUDED.name,
         short_name = EXCLUDED.short_name,
         tactics = EXCLUDED.tactics`,
      [
        club.id,
        club.divisionId,
        club.name,
        club.shortName,
        JSON.stringify(club.tactics),
      ],
    );
    for (const player of players) {
      await pool.query(
        `INSERT INTO players (
           id, club_id, name, role, form, fatigue, attributes,
           is_starter, slot, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           club_id = EXCLUDED.club_id,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           form = EXCLUDED.form,
           fatigue = EXCLUDED.fatigue,
           attributes = EXCLUDED.attributes,
           is_starter = EXCLUDED.is_starter,
           slot = EXCLUDED.slot,
           sort_order = EXCLUDED.sort_order`,
        [
          player.id,
          player.clubId,
          player.name,
          player.role,
          player.form,
          player.fatigue,
          JSON.stringify(player.attributes),
          player.isStarter,
          player.slot,
          player.sortOrder,
        ],
      );
    }
  }
}

export async function ensureScheduledMatch(
  pool: pg.Pool,
  input: {
    matchId?: string;
    seed: number;
    homeClubId?: string;
    awayClubId?: string;
  },
): Promise<string> {
  const matchId = input.matchId ?? DEFAULT_MATCH_ID;
  await pool.query(
    `INSERT INTO matches (
       id, division_id, home_club_id, away_club_id, seed, status
     ) VALUES ($1, $2, $3, $4, $5, 'scheduled')
     ON CONFLICT (id) DO UPDATE SET
       seed = EXCLUDED.seed,
       home_club_id = EXCLUDED.home_club_id,
       away_club_id = EXCLUDED.away_club_id,
       status = 'scheduled',
       home_goals = NULL,
       away_goals = NULL,
       played_at = NULL,
       events = NULL`,
    [
      matchId,
      DIVISION_ID,
      input.homeClubId ?? SEED_MATCHUP.home.team.id,
      input.awayClubId ?? SEED_MATCHUP.away.team.id,
      input.seed,
    ],
  );
  return matchId;
}

export async function loadSquad(pool: pg.Pool, clubId: string): Promise<Squad> {
  const clubRes = await pool.query(
    `SELECT id, division_id, name, short_name, tactics FROM clubs WHERE id = $1`,
    [clubId],
  );
  const clubRow = clubRes.rows[0];
  if (!clubRow) {
    throw new Error(`Unknown club ${clubId}`);
  }
  const playerRes = await pool.query(
    `SELECT id, club_id, name, role, form, fatigue, attributes,
            is_starter, slot, sort_order
     FROM players WHERE club_id = $1`,
    [clubId],
  );
  return squadFromRecords(clubFromRow(clubRow), playerRes.rows.map(playerFromRow));
}

export async function loadMatch(
  pool: pg.Pool,
  matchId: string,
): Promise<{
  id: string;
  status: string;
  seed: number;
  homeGoals: number | null;
  awayGoals: number | null;
  events: MatchEvent[] | null;
} | null> {
  const res = await pool.query(
    `SELECT id, status, seed, home_goals, away_goals, events
     FROM matches WHERE id = $1`,
    [matchId],
  );
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id as string,
    status: row.status as string,
    seed: row.seed as number,
    homeGoals: row.home_goals as number | null,
    awayGoals: row.away_goals as number | null,
    events: (row.events as MatchEvent[] | null) ?? null,
  };
}

export async function playScheduledMatch(
  pool: pg.Pool,
  matchId = DEFAULT_MATCH_ID,
): Promise<PlayedFixture> {
  const scheduled = await pool.query(
    `SELECT id, seed, home_club_id, away_club_id FROM matches WHERE id = $1`,
    [matchId],
  );
  const row = scheduled.rows[0];
  if (!row) {
    throw new Error(`No scheduled match ${matchId}`);
  }
  const home = await loadSquad(pool, row.home_club_id as string);
  const away = await loadSquad(pool, row.away_club_id as string);
  const seed = row.seed as number;
  const initial = createInitialState({
    home,
    away,
    seed,
    matchId: asMatchId(matchId),
  });
  const { events, finalState } = simulate({
    state: initial,
    homeTactics: initial.homeTactics,
    awayTactics: initial.awayTactics,
  });
  await pool.query(
    `UPDATE matches
     SET status = 'played',
         home_goals = $2,
         away_goals = $3,
         played_at = NOW(),
         events = $4::jsonb
     WHERE id = $1`,
    [
      matchId,
      finalState.score.home,
      finalState.score.away,
      JSON.stringify(events),
    ],
  );
  return {
    matchId,
    seed,
    homeGoals: finalState.score.home,
    awayGoals: finalState.score.away,
    eventCount: events.length,
  };
}

export async function persistSeedFixture(
  pool: pg.Pool,
  seed: number,
  matchId = DEFAULT_MATCH_ID,
): Promise<PlayedFixture> {
  await migrate(pool);
  await seedDivision(pool);
  await ensureScheduledMatch(pool, { matchId, seed });
  return playScheduledMatch(pool, matchId);
}

function clubFromRow(row: {
  id: string;
  division_id: string;
  name: string;
  short_name: string;
  tactics: TeamTactics;
}): ClubRecord {
  return {
    id: row.id,
    divisionId: row.division_id,
    name: row.name,
    shortName: row.short_name,
    tactics: row.tactics,
  };
}

function playerFromRow(row: {
  id: string;
  club_id: string;
  name: string;
  role: string;
  form: number;
  fatigue: number;
  attributes: PlayerAttributes;
  is_starter: boolean;
  slot: string | null;
  sort_order: number;
}): PlayerRecord {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    role: row.role as PlayerRecord["role"],
    form: row.form,
    fatigue: row.fatigue,
    attributes: row.attributes,
    isStarter: row.is_starter,
    slot: row.slot as PlayerRecord["slot"],
    sortOrder: row.sort_order,
  };
}
