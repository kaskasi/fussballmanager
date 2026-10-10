import type { FixtureResult, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import { pushWeeklyMinutes } from "../player/minute-history.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import type { CareerLeagueStat } from "../persistence/league-state.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { recordAppearanceGoals } from "../development/ability-stamps.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export interface CareerMatchWeekResult {
  players: Player[];
  matchdayStats: CareerLeagueStat[];
}

export function mergeCareerLeagueStats(
  season: readonly CareerLeagueStat[],
  matchday: readonly CareerLeagueStat[],
): CareerLeagueStat[] {
  const rows = new Map(season.map((row) => [row.playerId, { ...row }]));
  for (const row of matchday) {
    const existing = rows.get(row.playerId);
    if (existing) {
      existing.goals += row.goals;
      existing.assists += row.assists;
      existing.yellowCards += row.yellowCards;
      existing.minutes += row.minutes;
      existing.apps += row.apps;
    } else {
      rows.set(row.playerId, { ...row });
    }
  }
  return [...rows.values()];
}

export function applyCareerMatchWeek(
  players: readonly Player[],
  fixture: FixtureResult | null,
  playerClubEngineId: TeamId,
  matchday: number,
  masterSeed: number,
  season: number,
  engineClubStats?: readonly PlayerSeasonStat[],
  starterIds?: readonly string[],
): CareerMatchWeekResult {
  if (!fixture) return { players: [...players], matchdayStats: [] };

  const played =
    fixture.homeTeamId === playerClubEngineId || fixture.awayTeamId === playerClubEngineId;
  if (!played) return { players: [...players], matchdayStats: [] };

  const squad = players.filter(
    (player) => player.club_id === DEFAULT_CLUB_ID && player.squad_status === "pro",
  );
  if (squad.length === 0) return { players: [...players], matchdayStats: [] };

  const lineup = pickLineup(squad, masterSeed, season, matchday, starterIds);
  const goalsFor =
    fixture.homeTeamId === playerClubEngineId ? fixture.homeGoals : fixture.awayGoals;
  const goalsAgainst =
    fixture.homeTeamId === playerClubEngineId ? fixture.awayGoals : fixture.homeGoals;

  const useEngineStats = engineClubStats !== undefined && engineClubStats.length > 0;
  const goalMap = useEngineStats
    ? statsFieldMap(engineClubStats, squad, "goals")
    : distributeGoals(lineup.played, goalsFor, masterSeed, season, matchday, "goal");
  const assistMap = useEngineStats
    ? statsFieldMap(engineClubStats, squad, "assists")
    : distributeGoals(lineup.played, goalsFor, masterSeed, season, matchday, "assist", goalMap);
  const cardMap = useEngineStats
    ? statsFieldMap(engineClubStats, squad, "yellowCards")
    : distributeCards(lineup.played, masterSeed, season, matchday);

  const minutesById = new Map(lineup.minutes);
  const matchdayStats: CareerLeagueStat[] = [];
  const updated = new Map(players.map((player) => [player.id, player]));

  for (const player of squad) {
    const minutes = minutesById.get(player.id) ?? 0;
    if (minutes <= 0) continue;

    const goals = goalMap.get(player.id) ?? 0;
    const assists = assistMap.get(player.id) ?? 0;
    const yellowCards = cardMap.get(player.id) ?? 0;
    const tackles = matchTackles(player, minutes, masterSeed, season, matchday);
    const headers = matchHeaders(player, minutes, masterSeed, season, matchday);
    const withMinutes = pushWeeklyMinutes(player, minutes);
    const next: Player = {
      ...withMinutes,
      state: {
        ...withMinutes.state,
        season_apps: withMinutes.state.season_apps + 1,
        season_goals: withMinutes.state.season_goals + goals,
        season_assists: withMinutes.state.season_assists + assists,
        season_yellow_cards: (withMinutes.state.season_yellow_cards ?? 0) + yellowCards,
        season_tackles: (withMinutes.state.season_tackles ?? 0) + tackles,
        season_headers: (withMinutes.state.season_headers ?? 0) + headers,
        form: adjustForm(withMinutes.state.form, goals, assists, goalsAgainst, minutes),
      },
    };
    updated.set(player.id, recordAppearanceGoals(next, goals));
    matchdayStats.push({
      playerId: player.id,
      name: formatPlayerName(player),
      goals,
      assists,
      yellowCards,
      minutes,
      apps: 1,
    });
  }

  return {
    players: players.map((player) => updated.get(player.id) ?? player),
    matchdayStats,
  };
}

function statsFieldMap(
  engineClubStats: readonly PlayerSeasonStat[],
  squad: readonly Player[],
  field: "goals" | "assists" | "yellowCards",
): Map<string, number> {
  const squadIds = new Set(squad.map((player) => player.id));
  const counts = new Map<string, number>();
  for (const row of engineClubStats) {
    const playerId = String(row.playerId);
    if (!squadIds.has(playerId)) continue;
    counts.set(playerId, row[field]);
  }
  return counts;
}

interface LineupPick {
  played: Player[];
  minutes: Map<string, number>;
}

function pickLineup(
  squad: readonly Player[],
  masterSeed: number,
  season: number,
  matchday: number,
  starterIds?: readonly string[],
): LineupPick {
  const byId = new Map(squad.map((player) => [player.id, player]));
  let starters: Player[];
  let subs: Player[];

  if (starterIds && starterIds.length >= 11) {
    starters = starterIds
      .slice(0, 11)
      .map((id) => byId.get(id))
      .filter((player): player is Player => Boolean(player));
    const starterSet = new Set(starters.map((player) => player.id));
    subs = squad.filter((player) => !starterSet.has(player.id));
  } else {
    const ranked = [...squad].sort(
      (left, right) => estimateCa(right.attributes, right.position) - estimateCa(left.attributes, left.position),
    );
    const goalkeeper = ranked.find((player) => player.position === "GK") ?? ranked[0]!;
    const outfield = ranked.filter((player) => player.id !== goalkeeper.id);
    starters = [goalkeeper, ...outfield.slice(0, 10)];
    subs = outfield.slice(10, 15);
  }

  const minutes = new Map<string, number>();
  for (const player of starters) {
    minutes.set(player.id, 75 + (syncRoll(masterSeed, season, matchday, player.id, "min") % 16));
  }

  const subCount = Math.min(subs.length, goalsAgainstBand(matchday) + 1);
  for (let index = 0; index < subCount; index++) {
    const player = subs[index];
    if (!player) continue;
    minutes.set(player.id, 18 + (syncRoll(masterSeed, season, matchday, player.id, "sub") % 23));
  }

  return {
    played: [...starters, ...subs.slice(0, subCount)],
    minutes,
  };
}

function goalsAgainstBand(matchday: number): number {
  return matchday % 3;
}

function distributeGoals(
  lineup: readonly Player[],
  total: number,
  masterSeed: number,
  season: number,
  matchday: number,
  kind: "goal" | "assist",
  goalMap: Map<string, number> = new Map(),
): Map<string, number> {
  const counts = new Map<string, number>();
  const pool = lineup.filter((player) => player.position !== "GK");
  if (pool.length === 0 || total <= 0) return counts;

  for (let index = 0; index < total; index++) {
    const weights = pool.map((player) => {
      const base = kind === "goal" ? goalWeight(player) : assistWeight(player);
      if (kind === "assist" && (goalMap.get(player.id) ?? 0) > 0) return base * 0.35;
      return base;
    });
    const pick = weightedPick(pool, weights, masterSeed, season, matchday, `${kind}-${index}`);
    counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
  }
  return counts;
}

function distributeCards(
  lineup: readonly Player[],
  masterSeed: number,
  season: number,
  matchday: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  const pool = lineup.filter((player) => player.position !== "GK");
  const cardCount = syncRoll(masterSeed, season, matchday, "cards", "count") % 3;
  for (let index = 0; index < cardCount; index++) {
    const player = pool[syncRoll(masterSeed, season, matchday, "cards", String(index)) % pool.length];
    if (!player) continue;
    counts.set(player.id, (counts.get(player.id) ?? 0) + 1);
  }
  return counts;
}

function goalWeight(player: Player): number {
  const shooting = player.attributes.shooting;
  switch (player.position) {
    case "CF":
      return shooting * 1.6;
    case "LW":
    case "RW":
    case "AM":
      return shooting * 1.2;
    case "CM":
    case "LM":
    case "RM":
      return shooting * 0.55;
    default:
      return shooting * 0.25;
  }
}

function assistWeight(player: Player): number {
  const passing = player.attributes.passing;
  switch (player.position) {
    case "AM":
    case "LW":
    case "RW":
      return passing * 1.3;
    case "CM":
    case "LM":
    case "RM":
    case "DM":
      return passing * 1.1;
    default:
      return passing * 0.4;
  }
}

function weightedPick(
  pool: readonly Player[],
  weights: readonly number[],
  masterSeed: number,
  season: number,
  matchday: number,
  salt: string,
): Player {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = syncRoll(masterSeed, season, matchday, salt, "pick") % Math.max(1, Math.floor(total));
  for (let index = 0; index < pool.length; index++) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return pool[index]!;
  }
  return pool[pool.length - 1]!;
}

function matchTackles(
  player: Player,
  minutes: number,
  masterSeed: number,
  season: number,
  matchday: number,
): number {
  if (minutes <= 0) return 0;
  const rate = tackleRate(player);
  const base = Math.floor((minutes / 90) * rate);
  const bonus = syncRoll(masterSeed, season, matchday, player.id, "tkl") % 3;
  return base + (bonus === 0 ? 1 : 0);
}

function matchHeaders(
  player: Player,
  minutes: number,
  masterSeed: number,
  season: number,
  matchday: number,
): number {
  if (minutes <= 0) return 0;
  const rate = headerRate(player);
  const base = Math.floor((minutes / 90) * rate);
  const bonus = syncRoll(masterSeed, season, matchday, player.id, "hdr") % 4;
  return base + (bonus === 0 && rate >= 2 ? 1 : 0);
}

function tackleRate(player: Player): number {
  switch (player.position) {
    case "DM":
    case "CB":
      return 4.2;
    case "LB":
    case "RB":
      return 3.4;
    case "CM":
      return 2.8;
    case "LM":
    case "RM":
      return 2.2;
    default:
      return 1.2;
  }
}

function headerRate(player: Player): number {
  const aerial = player.attributes.strength * 0.45 + player.attributes.positioning * 0.25;
  switch (player.position) {
    case "CB":
      return 2.8 + aerial / 120;
    case "CF":
      return 2.2 + aerial / 140;
    case "DM":
      return 1.4 + aerial / 160;
    default:
      return 0.6 + aerial / 200;
  }
}

function adjustForm(
  form: number,
  goals: number,
  assists: number,
  goalsAgainst: number,
  minutes: number,
): number {
  let next = form;
  if (goals > 0) next += 0.35 * goals;
  if (assists > 0) next += 0.2 * assists;
  if (minutes >= 80 && goalsAgainst <= 1) next += 0.15;
  if (minutes < 30) next -= 0.1;
  return Math.min(4, Math.max(-4, next));
}

function syncRoll(
  masterSeed: number,
  season: number,
  matchday: number,
  playerId: string,
  salt: string,
): number {
  let hash = masterSeed ^ season ^ matchday;
  for (const ch of `${playerId}:${salt}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return hash >>> 0;
}
