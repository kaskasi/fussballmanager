/** Pick league opponents by starter CA vs Nordstern (offline lattice studies). */
import type { TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { clubStarterCaAverage } from "../sim/club-profiles.ts";
import { careerEngineSquadFromPlayers } from "../sim/career-engine-squad.ts";
import { squadForLeagueClub } from "../sim/league-divisions.ts";
import { NORDSTERN_TEAM_ID } from "../world/world-generator.ts";

export type OpponentStrengthBucket = "weaker" | "similar" | "stronger";

export interface LeagueClubCaRow {
  teamId: TeamId;
  starterCa: number;
}

export interface PickedStudyOpponent {
  opponentId: TeamId;
  nordsternStarterCa: number;
  opponentStarterCa: number;
  /** opponent CA − Nordstern CA */
  caDelta: number;
  bucket: OpponentStrengthBucket;
}

function nordsternStarterCa(session: GameSession): number | null {
  const squad = careerEngineSquadFromPlayers(session.players, NORDSTERN_TEAM_ID);
  if (!squad) return null;
  return clubStarterCaAverage(squad, session.players);
}

export function leagueClubStarterCaRows(session: GameSession): LeagueClubCaRow[] {
  const rows: LeagueClubCaRow[] = [];
  for (const teamId of session.league.club_ids) {
    if (teamId === NORDSTERN_TEAM_ID) continue;
    const squad = squadForLeagueClub(teamId, session.rivalPlayers, NORDSTERN_TEAM_ID);
    if (!squad) continue;
    const starterCa = clubStarterCaAverage(squad, session.rivalPlayers);
    if (starterCa === null) continue;
    rows.push({ teamId, starterCa });
  }
  return rows;
}

export function classifyStrengthBucket(
  nordsternCa: number,
  opponentCa: number,
): OpponentStrengthBucket {
  if (opponentCa < nordsternCa - 1) return "weaker";
  if (opponentCa > nordsternCa + 1) return "stronger";
  return "similar";
}

/** Evenly spaced opponents by starter CA (weakest → strongest in the save). */
export function pickOpponentsAcrossCaSpectrum(
  session: GameSession,
  count: number,
): PickedStudyOpponent[] {
  const nordsternCa = nordsternStarterCa(session);
  if (nordsternCa === null || count <= 0) return [];
  const rows = leagueClubStarterCaRows(session).sort((a, b) => a.starterCa - b.starterCa);
  if (rows.length === 0) return [];

  const pickedRows: LeagueClubCaRow[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const idx =
      count <= 1 ? 0 : Math.min(rows.length - 1, Math.round((i * (rows.length - 1)) / (count - 1)));
    const row = rows[idx];
    if (row && !used.has(row.teamId)) {
      pickedRows.push(row);
      used.add(row.teamId);
    }
  }
  for (const row of rows) {
    if (pickedRows.length >= count) break;
    if (!used.has(row.teamId)) {
      pickedRows.push(row);
      used.add(row.teamId);
    }
  }

  return pickedRows.map((row) => ({
    opponentId: row.teamId,
    nordsternStarterCa: nordsternCa,
    opponentStarterCa: row.starterCa,
    caDelta: row.starterCa - nordsternCa,
    bucket: classifyStrengthBucket(nordsternCa, row.starterCa),
  }));
}

export function studyMetaForOpponent(
  session: GameSession,
  opponentId: TeamId,
): PickedStudyOpponent | null {
  const nordsternCa = nordsternStarterCa(session);
  if (nordsternCa === null) return null;
  const squad = squadForLeagueClub(opponentId, session.rivalPlayers, NORDSTERN_TEAM_ID);
  if (!squad) return null;
  const opponentCa = clubStarterCaAverage(squad, session.rivalPlayers);
  if (opponentCa === null) return null;
  return {
    opponentId,
    nordsternStarterCa: nordsternCa,
    opponentStarterCa: opponentCa,
    caDelta: opponentCa - nordsternCa,
    bucket: classifyStrengthBucket(nordsternCa, opponentCa),
  };
}

export function pickOpponentForStrengthBucket(
  session: GameSession,
  bucket: OpponentStrengthBucket,
): PickedStudyOpponent | null {
  const nordsternCa = nordsternStarterCa(session);
  if (nordsternCa === null) return null;
  const rows = leagueClubStarterCaRows(session);
  if (rows.length === 0) return null;

  let pick: LeagueClubCaRow | undefined;
  if (bucket === "weaker") {
    const weaker = rows.filter((row) => row.starterCa < nordsternCa);
    pick = weaker.sort((a, b) => b.starterCa - a.starterCa)[0];
    if (!pick) {
      pick = rows.sort((a, b) => a.starterCa - b.starterCa)[0];
    }
  } else if (bucket === "stronger") {
    const stronger = rows.filter((row) => row.starterCa > nordsternCa);
    pick = stronger.sort((a, b) => a.starterCa - b.starterCa)[0];
    if (!pick) {
      pick = rows.sort((a, b) => b.starterCa - a.starterCa)[0];
    }
  } else {
    pick = rows
      .map((row) => ({ row, dist: Math.abs(row.starterCa - nordsternCa) }))
      .sort((a, b) => a.dist - b.dist || a.row.starterCa - b.row.starterCa)[0]?.row;
  }

  if (!pick) return null;
  return {
    opponentId: pick.teamId,
    nordsternStarterCa: nordsternCa,
    opponentStarterCa: pick.starterCa,
    caDelta: pick.starterCa - nordsternCa,
    bucket: classifyStrengthBucket(nordsternCa, pick.starterCa),
  };
}
