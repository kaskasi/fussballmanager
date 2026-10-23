import {
  type Player as EnginePlayer,
  type PlayerRole,
  type PlayerAttributes as EngineAttributes,
  type TeamId,
} from "@fussballmanager/shared";
import { applyTrainingWeek } from "../development/pipeline-week.ts";
import { seedPhaseStamps } from "../development/ability-stamps.ts";
import { defaultTrainingPlan, planToSessions } from "../development/training-units.ts";
import type { Attributes, Player, PositionPrimary } from "../types/player.ts";
import {
  generateWorld,
  WORLD_CLUB_SEED,
  NORDSTERN_CLUB_ID,
} from "../world/world-generator.ts";
import { isLeagueMatchWeek } from "./game-calendar.ts";
import { generateContractWeights } from "../transfers/contract-priorities.ts";
import { fairInitialProContract } from "../transfers/fair-initial-contract.ts";
import { refreshPlayerMarketValue } from "../transfers/refresh-market-values.ts";

const AI_TRAINING = planToSessions(defaultTrainingPlan());

export function careerTeamId(teamId: TeamId): string {
  return `cl_${teamId.replace(/-/g, "_")}`;
}

export function engineTeamId(clubId: string): TeamId {
  return clubId.replace(/^cl_/, "").replace(/_/g, "-") as TeamId;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x9e3779b1);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function engineRoleToPosition(role: PlayerRole): PositionPrimary {
  switch (role) {
    case "GK":
      return "GK";
    case "CB":
      return "CB";
    case "FB":
      return "RB";
    case "DM":
      return "DM";
    case "CM":
      return "CM";
    case "AM":
      return "AM";
    case "W":
      return "LW";
    case "ST":
      return "CF";
    default:
      return "CM";
  }
}

function scaleEngineToCareer(value: number): number {
  return Math.min(165, Math.max(35, Math.round((value / 99) * 118 + 32)));
}

function engineAttributesToCareer(attrs: EngineAttributes, role: PlayerRole): Attributes {
  const up = scaleEngineToCareer;
  const physical = up(attrs.aerial * 0.35 + attrs.tackling * 0.65);
  return {
    shooting: up(attrs.shooting),
    passing: up(attrs.passing),
    dribbling: up(attrs.dribbling),
    technique: up(attrs.dribbling * 0.55 + attrs.passing * 0.45),
    pace: up(attrs.pace),
    strength: physical,
    stamina: up(attrs.stamina),
    composure: up(attrs.positioning * 0.75 + attrs.passing * 0.25),
    leadership: role === "GK" || role === "CB" ? 58 : 50,
    positioning: up(attrs.positioning),
    vision: up(attrs.passing * 0.85 + attrs.dribbling * 0.15),
    concentration: up(attrs.positioning * 0.8),
    teamwork: 62,
    weak_foot: 52,
    gk_handling: role === "GK" ? up(attrs.goalkeeping) : 8,
  };
}

function hiddenForEnginePlayer(enginePlayer: EnginePlayer, masterSeed: number): Player["hidden"] {
  const rng = mulberry32(hashString(`${masterSeed}:${enginePlayer.id}`));
  const anlageValue = 0.88 + rng() * 0.5;
  const anlage = {
    shooting: anlageValue,
    passing: anlageValue,
    dribbling: anlageValue,
    technique: anlageValue,
    pace: anlageValue,
    strength: anlageValue,
    stamina: anlageValue,
    composure: anlageValue,
    leadership: anlageValue,
    positioning: anlageValue,
    vision: anlageValue,
    concentration: anlageValue,
    teamwork: anlageValue,
    weak_foot: anlageValue,
    gk_handling: anlageValue,
  };
  return {
    anlage,
    drive: 0.75 + rng() * 0.55,
    maturity_offset: Math.round((rng() - 0.5) * 4) / 10,
    breakout_flags: [],
    contract_weights: generateContractWeights(enginePlayer.id, masterSeed),
  };
}

function splitEngineName(fullName: string): Player["name"] {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { first: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function rivalCareerId(enginePlayer: EnginePlayer): string {
  return `rp_${enginePlayer.teamId}_${enginePlayer.shirt}`;
}

export function enginePlayerToCareer(
  enginePlayer: EnginePlayer,
  masterSeed: number,
): Player {
  const rng = mulberry32(hashString(`${masterSeed}:birth:${enginePlayer.id}`));
  const age = 19 + Math.floor(rng() * 10);
  const clubId = careerTeamId(enginePlayer.teamId);
  const built: Player = {
    id: rivalCareerId(enginePlayer),
    name: splitEngineName(enginePlayer.name),
    birth: {
      date: `${2005 + age}-${String(1 + Math.floor(rng() * 11)).padStart(2, "0")}-15`,
      place: "Nord",
      region: "Schleswig-Holstein",
    },
    nationality: "DE",
    age,
    club_id: clubId,
    squad_status: "pro",
    position: engineRoleToPosition(enginePlayer.role),
    flexibility: [],
    contract: null,
    market_value: 120_000,
    attributes: engineAttributesToCareer(enginePlayer.attributes, enginePlayer.role),
    hidden: hiddenForEnginePlayer(enginePlayer, masterSeed),
    state: {
      fitness: 88,
      injury: null,
      form: 0,
      morale: 65,
      weekly_minutes: 0,
      season_minutes: 0,
      season_apps: 0,
      season_goals: 0,
      season_assists: 0,
      season_yellow_cards: 0,
      season_tackles: 0,
      season_headers: 0,
      recent_growth_26w: 0,
      recent_weekly_minutes: [],
      modifiers: [],
    },
    history: {
      growth: [],
      clubs: [{ club_id: clubId, from_season: 1, to_season: null, apps: 0, goals: 0 }],
      achievements: [],
      milestones: [],
    },
    stamps: [],
    portrait_seed: hashString(enginePlayer.id),
  };
  const valued = refreshPlayerMarketValue(built, 1);
  const withContract: Player = {
    ...valued,
    contract: fairInitialProContract(valued, 1, 2 + Math.floor(rng() * 3)),
  };
  return seedPhaseStamps(withContract, 1, 1);
}

export function initializeRivalPlayers(masterSeed: number): Player[] {
  return generateWorld(masterSeed, WORLD_CLUB_SEED).players.filter(
    (player) => player.club_id !== NORDSTERN_CLUB_ID,
  );
}

export function normalizeRivalPlayers(
  rivalPlayers: readonly Player[] | undefined,
  masterSeed: number,
): Player[] {
  const existing = rivalPlayers ?? [];
  if (existing.length > 0) return existing as Player[];
  return initializeRivalPlayers(masterSeed);
}

function rivalMinutesFromId(playerId: string, leagueMatchWeek: boolean): number {
  const shirt = Number.parseInt(playerId.split("_").pop() ?? "12", 10);
  if (!leagueMatchWeek) return 12;
  if (shirt <= 11) return 68 + (shirt % 5) * 3;
  return 8 + (shirt % 4) * 5;
}

export function advanceRivalGrowthWeek(
  rivalPlayers: readonly Player[],
  season: number,
  week: number,
  masterSeed: number,
  leagueMatchWeek: boolean,
): Player[] {
  const context = { season, week, masterSeed };
  const playedWeek = leagueMatchWeek && isLeagueMatchWeek(week);
  return rivalPlayers.map((player) => {
    const minutes = rivalMinutesFromId(player.id, playedWeek);
    const appeared = playedWeek && minutes >= 45;
    const withMinutes = {
      ...player,
      state: {
        ...player.state,
        weekly_minutes: minutes,
        season_apps: player.state.season_apps + (appeared ? 1 : 0),
      },
    };
    return applyTrainingWeek(withMinutes, AI_TRAINING, context);
  });
}

export function ageRivalPlayers(rivalPlayers: readonly Player[]): Player[] {
  return rivalPlayers.map((player) => ({
    ...player,
    age: player.age + 1,
  }));
}
