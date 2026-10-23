import type { MatchEvent, Player, Squad } from "@fussballmanager/shared";
import { CALIBRATION_BANDS, type CalibrationMetricId } from "./calibration-bands.ts";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";

export type CalibrationFixture = { home: Squad; away: Squad };

export type CalibrationMetrics = Record<CalibrationMetricId, number> & {
  matches: number;
  maxGoals: number;
  homeWinRate: number;
  awayWinRate: number;
};

type MatchTotals = {
  homeGoals: number;
  awayGoals: number;
  shots: number;
  onTarget: number;
  passes: number;
  passesComplete: number;
  fouls: number;
  yellows: number;
  reds: number;
  corners: number;
  /** Top shooter's share of team shots, per team with ≥ 4 shots. */
  topShooterShares: number[];
  hatTrick: boolean;
};

function countBy(ids: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/** One match's tallies from its event stream. */
export function matchTotals(
  events: readonly MatchEvent[],
  homeTeamId: string,
  awayTeamId: string,
): MatchTotals {
  let homeGoals = 0;
  let awayGoals = 0;
  let shots = 0;
  let onTarget = 0;
  let passes = 0;
  let passesComplete = 0;
  let fouls = 0;
  let yellows = 0;
  let reds = 0;
  let corners = 0;
  const shooters: Record<string, string[]> = { [homeTeamId]: [], [awayTeamId]: [] };
  const scorers: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case "shot":
        shots += 1;
        if (event.outcome === "goal" || event.outcome === "save") onTarget += 1;
        shooters[event.shooter.teamId]?.push(event.shooter.playerId);
        break;
      case "goal":
        scorers.push(event.scorer.playerId);
        if (event.scorer.teamId === homeTeamId) homeGoals += 1;
        else awayGoals += 1;
        break;
      case "pass":
        passes += 1;
        if (event.complete) passesComplete += 1;
        break;
      case "foul":
        fouls += 1;
        break;
      case "card":
        if (event.color === "yellow") yellows += 1;
        else reds += 1;
        break;
      case "restart":
        if (event.phase === "corner") corners += 1;
        break;
      default:
        break;
    }
  }
  const topShooterShares = Object.values(shooters)
    .filter((ids) => ids.length >= 4)
    .map((ids) => Math.max(...countBy(ids).values()) / ids.length);
  const hatTrick = [...countBy(scorers).values()].some((goals) => goals >= 3);
  return {
    homeGoals,
    awayGoals,
    shots,
    onTarget,
    passes,
    passesComplete,
    fouls,
    yellows,
    reds,
    corners,
    topShooterShares,
    hatTrick,
  };
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Every fixture × every seed, averaged per match. */
export function runCalibration(input: {
  fixtures: readonly CalibrationFixture[];
  seeds: readonly number[];
}): CalibrationMetrics {
  const all: MatchTotals[] = [];
  for (const fixture of input.fixtures) {
    for (const seed of input.seeds) {
      const state = createInitialState({ home: fixture.home, away: fixture.away, seed });
      const { events } = simulate({
        state,
        homeTactics: state.homeTactics,
        awayTactics: state.awayTactics,
      });
      all.push(matchTotals(events, state.homeTeamId, state.awayTeamId));
    }
  }
  const goals = all.map((m) => m.homeGoals + m.awayGoals);
  const shots = mean(all.map((m) => m.shots));
  const passes = all.reduce((sum, m) => sum + m.passes, 0);
  const n = Math.max(1, all.length);
  return {
    matches: all.length,
    goals: mean(goals),
    maxGoals: goals.length ? Math.max(...goals) : 0,
    shots,
    onTarget: mean(all.map((m) => m.onTarget)),
    conversion: shots > 0 ? mean(goals) / shots : 0,
    topShooterShare: mean(all.flatMap((m) => m.topShooterShares)),
    hatTrickRate: all.filter((m) => m.hatTrick).length / n,
    passCompletion: passes > 0 ? all.reduce((sum, m) => sum + m.passesComplete, 0) / passes : 0,
    fouls: mean(all.map((m) => m.fouls)),
    yellows: mean(all.map((m) => m.yellows)),
    reds: mean(all.map((m) => m.reds)),
    corners: mean(all.map((m) => m.corners)),
    homeWinRate: all.filter((m) => m.homeGoals > m.awayGoals).length / n,
    drawRate: all.filter((m) => m.homeGoals === m.awayGoals).length / n,
    awayWinRate: all.filter((m) => m.homeGoals < m.awayGoals).length / n,
  };
}

export type BandRow = {
  metric: CalibrationMetricId;
  value: number;
  min: number;
  max: number;
  ok: boolean;
};

export function bandRows(metrics: CalibrationMetrics): BandRow[] {
  return (Object.keys(CALIBRATION_BANDS) as CalibrationMetricId[]).map((metric) => {
    const band = CALIBRATION_BANDS[metric];
    const value = metrics[metric];
    return { metric, value, min: band.min, max: band.max, ok: value >= band.min && value <= band.max };
  });
}

const PERCENT_METRICS: ReadonlySet<CalibrationMetricId> = new Set([
  "conversion",
  "topShooterShare",
  "hatTrickRate",
  "passCompletion",
  "drawRate",
]);

function formatValue(metric: CalibrationMetricId, value: number): string {
  return PERCENT_METRICS.has(metric) ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
}

export function formatCalibration(label: string, metrics: CalibrationMetrics): string {
  const rows = bandRows(metrics).map((row) => {
    const band = `${formatValue(row.metric, row.min)}–${formatValue(row.metric, row.max)}`;
    return `  ${row.ok ? "ok  " : "MISS"} ${row.metric.padEnd(16)} ${formatValue(row.metric, row.value).padStart(8)}   band ${band}`;
  });
  const hda = `${(metrics.homeWinRate * 100).toFixed(0)}/${(metrics.drawRate * 100).toFixed(0)}/${(metrics.awayWinRate * 100).toFixed(0)}`;
  return [`${label} — ${metrics.matches} matches, max goals ${metrics.maxGoals}, H/D/A ${hda}%`, ...rows].join("\n");
}

/** Every skill attribute × k (clamped 1–99); keeps height and non-GK keeping. */
export function scaleSquad(squad: Squad, k: number): Squad {
  const scale = (value: number) => Math.min(99, Math.max(1, Math.round(value * k)));
  const scalePlayer = (player: Player): Player => {
    const a = player.attributes;
    return {
      ...player,
      attributes: {
        ...a,
        passing: scale(a.passing),
        tackling: scale(a.tackling),
        shooting: scale(a.shooting),
        pace: scale(a.pace),
        stamina: scale(a.stamina),
        positioning: scale(a.positioning),
        aerial: scale(a.aerial),
        dribbling: scale(a.dribbling),
        goalkeeping: a.goalkeeping > 1 ? scale(a.goalkeeping) : a.goalkeeping,
      },
    };
  };
  return {
    ...squad,
    starters: squad.starters.map((place) => ({ ...place, player: scalePlayer(place.player) })),
    bench: squad.bench.map(scalePlayer),
  };
}

/** Round robin, both venues. */
export function roundRobin(squads: readonly Squad[]): CalibrationFixture[] {
  const fixtures: CalibrationFixture[] = [];
  for (const home of squads) {
    for (const away of squads) {
      if (home.team.id !== away.team.id) fixtures.push({ home, away });
    }
  }
  return fixtures;
}

export function seedRange(count: number, start = 5000, step = 13): number[] {
  return Array.from({ length: count }, (_, index) => start + index * step);
}
