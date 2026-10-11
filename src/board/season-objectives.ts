import { NORDSTERN_ID, type TeamId } from "@fussballmanager/shared";
import { leagueTablePlace, type ClubFinances } from "../economy/club-finances.ts";
import { weeksOfWages } from "../economy/spend-runway.ts";
import { weeklyMerchandisingEconomics } from "../economy/merchandising.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { playerTableRow } from "../sim/league-week.ts";
import { precinctMedicalCenterLevel } from "../stadium/precinct-effects.ts";
import { isCampStaffed } from "../youth/satellite-camps.ts";
import {
  clubStandingTier,
  survivalPlaceTarget,
  upperHalfPlaceTarget,
  type ClubStandingTier,
} from "./club-standing-tier.ts";
import type {
  BoardObjective,
  BoardProjectId,
  BoardSeasonBaselines,
  BoardState,
  ObjectiveProgress,
  SeasonObjectiveEvaluation,
} from "./board-state.ts";

const SUCCESS_BONUS = 200_000;
const FAILURE_PENALTY = 75_000;
const MIN_RUNWAY_WEEKS = 4;
const AVG_CA_IMPROVE = 2;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x9e3779b1);
  }
  return hash >>> 0;
}

function squadAvgCa(players: readonly Player[], clubId: string): number {
  const pros = players.filter((p) => p.club_id === clubId && p.squad_status === "pro");
  if (pros.length === 0) return 0;
  const sum = pros.reduce(
    (acc, p) => acc + estimateCa(p.attributes, p.position),
    0,
  );
  return Math.round(sum / pros.length);
}

function pickProjectId(seed: number): BoardProjectId {
  const options: BoardProjectId[] = [
    "youth_camps",
    "stadium_expand",
    "medical_center",
    "merch_revenue",
  ];
  return options[seed % options.length]!;
}

function projectObjective(projectId: BoardProjectId, season: number): BoardObjective {
  const suffix = season > 1 ? ` (S${season})` : "";
  switch (projectId) {
    case "youth_camps":
      return {
        id: "project_camps",
        kind: "project",
        projectId,
        target: 1,
        mandatory: false,
        label: `Jugendcamp besetzen${suffix}`,
        icon: "camp",
      };
    case "stadium_expand":
      return {
        id: "project_stadium",
        kind: "project",
        projectId,
        target: 1,
        mandatory: false,
        label: `Stadion ausbauen${suffix}`,
        icon: "stadium",
      };
    case "medical_center":
      return {
        id: "project_medical",
        kind: "project",
        projectId,
        target: 1,
        mandatory: false,
        label: `Arztzentrum im Gelände${suffix}`,
        icon: "medical",
      };
    case "merch_revenue":
      return {
        id: "project_merch",
        kind: "project",
        projectId,
        target: 125,
        mandatory: false,
        label: `Fanshop-Einnahmen +25 %${suffix}`,
        icon: "merch",
      };
  }
}

function objectivesForTier(
  tier: ClubStandingTier,
  employerClubId: TeamId,
  season: number,
  baselines: BoardSeasonBaselines,
  projectId: BoardProjectId,
): BoardObjective[] {
  const suffix = season > 1 ? ` (S${season})` : "";
  const survivalTarget = survivalPlaceTarget();
  const objectives: BoardObjective[] = [];

  switch (tier) {
    case "survival_low":
      objectives.push({
        id: "league_place",
        kind: "league_place_max",
        target: survivalTarget,
        mandatory: true,
        label: `Klassenerhalt — Platz ${survivalTarget} oder besser${suffix}`,
        icon: "survival",
      });
      objectives.push({
        id: "runway_weeks",
        kind: "min_runway_weeks",
        target: MIN_RUNWAY_WEEKS,
        mandatory: false,
        label: `Liquidität — min. ${MIN_RUNWAY_WEEKS} Wochen Gehälter${suffix}`,
        icon: "cash",
      });
      break;
    case "survival_mid":
      objectives.push({
        id: "league_place",
        kind: "league_place_max",
        target: survivalTarget,
        mandatory: true,
        label: `Klassenerhalt — Platz ${survivalTarget} oder besser${suffix}`,
        icon: "survival",
      });
      objectives.push({
        id: "avg_ca",
        kind: "avg_ca_min",
        target: baselines.avg_ca + AVG_CA_IMPROVE,
        mandatory: false,
        label: `Kader-Ø CA verbessern (≥ ${baselines.avg_ca + AVG_CA_IMPROVE})${suffix}`,
        icon: "growth",
      });
      break;
    case "upper_half":
      objectives.push({
        id: "league_place",
        kind: "league_place_max",
        target: upperHalfPlaceTarget(),
        mandatory: true,
        label: `Obere Hälfte — Platz ${upperHalfPlaceTarget()} oder besser${suffix}`,
        icon: "table",
      });
      objectives.push({
        id: "avg_ca",
        kind: "avg_ca_min",
        target: baselines.avg_ca + AVG_CA_IMPROVE,
        mandatory: true,
        label: `Kader-Ø CA verbessern (≥ ${baselines.avg_ca + AVG_CA_IMPROVE})${suffix}`,
        icon: "growth",
      });
      objectives.push({
        id: "goal_diff",
        kind: "goal_difference_min",
        target: 1,
        mandatory: true,
        label: `Positives Torverhältnis${suffix}`,
        icon: "goals",
      });
      break;
    case "ambition":
      objectives.push({
        id: "league_place",
        kind: "league_place_max",
        target: employerClubId === NORDSTERN_ID ? 3 : 4,
        mandatory: true,
        label: `Platz ${employerClubId === NORDSTERN_ID ? 3 : 4} oder besser${suffix}`,
        icon: "trophy",
      });
      objectives.push({
        id: "league_points",
        kind: "min_points",
        target: employerClubId === NORDSTERN_ID ? 40 : 34,
        mandatory: false,
        label: `Mindestens ${employerClubId === NORDSTERN_ID ? 40 : 34} Punkte${suffix}`,
        icon: "points",
      });
      objectives.push({
        id: "club_cash",
        kind: "min_cash",
        target: employerClubId === NORDSTERN_ID ? 3_500_000 : 2_800_000,
        mandatory: false,
        label: `Cash ≥ € ${Math.round((employerClubId === NORDSTERN_ID ? 3_500_000 : 2_800_000) / 100_000) / 10} Mio.${suffix}`,
        icon: "cash",
      });
      break;
  }

  objectives.push(projectObjective(projectId, season));
  return objectives;
}

export interface BoardProgressContext {
  players: readonly Player[];
  clubId: string;
  stadium: GameSession["stadium"];
  youthCamps: GameSession["youthCamps"];
  weeklyWageBill: number;
}

export function generateSeasonObjectives(
  employerClubId: TeamId,
  season: number,
  league: LeagueState,
  baselines: BoardSeasonBaselines,
  masterSeed = 1,
): BoardObjective[] {
  const tier = clubStandingTier(league, employerClubId);
  const projectId = pickProjectId(hashString(`${masterSeed}:${employerClubId}:${season}:project`));
  return objectivesForTier(tier, employerClubId, season, baselines, projectId);
}

export function startBoardSeason(
  board: BoardState,
  employerClubId: TeamId,
  season: number,
  league: LeagueState,
  session?: Pick<
    GameSession,
    "players" | "clubId" | "stadium" | "youthCamps" | "masterSeed" | "season" | "week"
  >,
): BoardState {
  const clubId = session?.clubId ?? `cl_${employerClubId.replace(/-/g, "_")}`;
  const avg_ca = session ? squadAvgCa(session.players, clubId) : 70;
  const merch_weekly_net = session
    ? weeklyMerchandisingEconomics({
        stadium: session.stadium,
        players: session.players,
        clubId,
        occupancy: 0.72,
        isHomeMatchWeek: false,
        season: session.season,
        week: session.week,
        masterSeed: session.masterSeed,
      }).net
    : undefined;
  const baselines: BoardSeasonBaselines = { avg_ca, merch_weekly_net };
  return {
    ...board,
    employer_club_id: employerClubId,
    objectives: generateSeasonObjectives(
      employerClubId,
      season,
      league,
      baselines,
      session?.masterSeed ?? 1,
    ),
    season_baselines: baselines,
    pressure: 0,
    job_status: "employed",
    promotions_this_season: 0,
    last_evaluation: undefined,
  };
}

function projectProgress(
  objective: BoardObjective,
  ctx: BoardProgressContext | undefined,
  baselines: BoardSeasonBaselines | undefined,
): ObjectiveProgress | null {
  if (!objective.projectId || !ctx) return null;
  switch (objective.projectId) {
    case "youth_camps": {
      const staffed = ctx.youthCamps.filter((camp) => isCampStaffed(camp)).length;
      return {
        objectiveId: objective.id,
        current: staffed,
        met: staffed >= objective.target,
      };
    }
    case "stadium_expand": {
      const expansions = Object.values(ctx.stadium.block_expansion ?? {}).filter(
        (entry) => (entry?.level ?? 0) > 0,
      ).length;
      return {
        objectiveId: objective.id,
        current: expansions,
        met: expansions >= 1,
      };
    }
    case "medical_center": {
      const level = precinctMedicalCenterLevel(ctx.stadium.precinct);
      return {
        objectiveId: objective.id,
        current: level,
        met: level >= 1,
      };
    }
    case "merch_revenue": {
      const baseline = baselines?.merch_weekly_net ?? 0;
      const current = weeklyMerchandisingEconomics({
        stadium: ctx.stadium,
        players: ctx.players,
        clubId: ctx.clubId,
        occupancy: 0.72,
        isHomeMatchWeek: true,
      }).net;
      const pct = baseline > 0 ? Math.round((current / baseline) * 100) : current > 0 ? 100 : 0;
      return {
        objectiveId: objective.id,
        current: pct,
        met: pct >= objective.target,
      };
    }
  }
}

export function objectiveProgress(
  objective: BoardObjective,
  league: LeagueState,
  finances: ClubFinances,
  ctx?: BoardProgressContext,
  baselines?: BoardSeasonBaselines,
): ObjectiveProgress {
  if (objective.kind === "project") {
    const project = projectProgress(objective, ctx, baselines);
    if (project) return project;
  }
  const row = playerTableRow(league);
  switch (objective.kind) {
    case "league_place_max": {
      const place = leagueTablePlace(league);
      return { objectiveId: objective.id, current: place, met: place <= objective.target };
    }
    case "min_points": {
      const points = row?.points ?? 0;
      return { objectiveId: objective.id, current: points, met: points >= objective.target };
    }
    case "min_cash": {
      const cash = finances.cash;
      return { objectiveId: objective.id, current: cash, met: cash >= objective.target };
    }
    case "min_runway_weeks": {
      const bill = ctx?.weeklyWageBill ?? 0;
      const weeks = weeksOfWages(finances.cash, bill) ?? 0;
      return {
        objectiveId: objective.id,
        current: Math.floor(weeks),
        met: weeks >= objective.target,
      };
    }
    case "avg_ca_min": {
      const avg = ctx ? squadAvgCa(ctx.players, ctx.clubId) : 0;
      return { objectiveId: objective.id, current: avg, met: avg >= objective.target };
    }
    case "goal_difference_min": {
      const gf = row?.goalsFor ?? 0;
      const ga = row?.goalsAgainst ?? 0;
      const gd = gf - ga;
      return { objectiveId: objective.id, current: gd, met: gd > 0 };
    }
    case "project":
      return { objectiveId: objective.id, current: 0, met: false };
  }
}

export function boardObjectiveProgress(
  board: BoardState,
  league: LeagueState,
  finances: ClubFinances,
  ctx?: BoardProgressContext,
): ObjectiveProgress[] {
  return board.objectives.map((objective) =>
    objectiveProgress(objective, league, finances, ctx, board.season_baselines),
  );
}

export function boardPressureTone(pressure: number): "good" | "warn" | "bad" {
  if (pressure >= 60) return "bad";
  if (pressure >= 30) return "warn";
  return "good";
}

export function evaluateSeasonObjectives(
  board: BoardState,
  league: LeagueState,
  finances: ClubFinances,
  season: number,
  ctx?: BoardProgressContext,
): { board: BoardState; finances: ClubFinances; evaluation: SeasonObjectiveEvaluation } {
  const progress = boardObjectiveProgress(board, league, finances, ctx);
  const metIds = progress.filter((entry) => entry.met).map((entry) => entry.objectiveId);
  const failedIds = progress.filter((entry) => !entry.met).map((entry) => entry.objectiveId);
  const mandatoryFailed = board.objectives.some((objective) => {
    if (!objective.mandatory) return false;
    const entry = progress.find((p) => p.objectiveId === objective.id);
    return entry ? !entry.met : true;
  });
  const dismissed = mandatoryFailed;
  const metCount = metIds.length;
  let bonusPaid = 0;
  let nextFinances = finances;
  let pressure = board.pressure;

  if (metCount === board.objectives.length) {
    bonusPaid = SUCCESS_BONUS;
    nextFinances = { ...finances, cash: finances.cash + SUCCESS_BONUS };
    pressure = 0;
  } else if (dismissed) {
    pressure = 100;
  } else if (failedIds.length > 0) {
    pressure = Math.min(100, pressure + 25);
    if (failedIds.some((id) => board.objectives.find((o) => o.id === id)?.kind === "min_cash")) {
      nextFinances = { ...finances, cash: Math.max(0, finances.cash - FAILURE_PENALTY) };
    }
  }

  const evaluation: SeasonObjectiveEvaluation = {
    season,
    metIds,
    failedIds,
    bonusPaid,
    dismissed,
    summary: dismissed
      ? "Vorstand entlässt dich — sportliches Pflichtziel verfehlt."
      : metCount === board.objectives.length
        ? "Alle Saisonziele erreicht — Vorstand zahlt Bonus."
        : `${metCount}/${board.objectives.length} Ziele erreicht — Verwarnung.`,
  };

  return {
    board: {
      ...board,
      pressure,
      job_status: dismissed ? "dismissed" : "employed",
      last_evaluation: evaluation,
    },
    finances: nextFinances,
    evaluation,
  };
}

export function formatObjectiveProgress(
  objective: BoardObjective,
  progress: ObjectiveProgress,
): string {
  switch (objective.kind) {
    case "league_place_max":
      return `#${progress.current}`;
    case "min_points":
      return `${progress.current} Pkt`;
    case "min_cash": {
      const millions = progress.current / 1_000_000;
      return `€ ${millions.toFixed(1)}M`;
    }
    case "min_runway_weeks":
      return `${progress.current} Wo`;
    case "avg_ca_min":
      return `Ø ${progress.current}`;
    case "goal_difference_min":
      return progress.current > 0 ? `+${progress.current}` : String(progress.current);
    case "project":
      return objective.projectId === "merch_revenue" ? `${progress.current}%` : String(progress.current);
  }
}
