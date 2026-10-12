import type { MatchClock, MatchEvent } from "./match-event.ts";
import type { PlayerId, TeamId } from "./ids.ts";
import type { Squad } from "./squad.ts";
import { aggregatePlayerMatchStats, type PlayerSeasonStat } from "./match-player-stats.ts";

export type MatchReportGoal = {
  minuteLabel: string;
  scorerName: string;
  assistName?: string;
  teamId: TeamId;
};

export type MatchReportCard = {
  minuteLabel: string;
  playerName: string;
  color: "yellow" | "red";
  teamId: TeamId;
};

export type MatchReportConditions = {
  referee: string;
  weather: string;
};

export type MatchReport = {
  conditions: MatchReportConditions;
  goals: MatchReportGoal[];
  cards: MatchReportCard[];
  playerStats: PlayerSeasonStat[];
};

const REFEREES = [
  "Dr. Felix Brand",
  "Sascha Stegemann",
  "Daniel Schlager",
  "Robert Hartmann",
  "Tobias Welz",
  "Christian Dingert",
] as const;

const WEATHER = [
  "Sonnig, 21 °C",
  "Leicht bewölkt, 18 °C",
  "Windig, 14 °C",
  "Leichter Regen, 12 °C",
  "Herbstsonne, 16 °C",
] as const;

function hashPickIndex(seed: number, salt: string, length: number): number {
  let hash = seed;
  for (let index = 0; index < salt.length; index += 1) {
    hash = Math.imul(hash ^ salt.charCodeAt(index), 0x9e3779b1);
  }
  return Math.abs(hash) % length;
}

function hashPick(seed: number, salt: string, options: readonly string[]): string {
  return options[hashPickIndex(seed, salt, options.length)]!;
}

/** Stable weather variant for display i18n (`match.weather.{index}`). */
export function matchWeatherIndex(seed: number): number {
  return hashPickIndex(seed, "weather", WEATHER.length);
}

export function formatMatchMinuteLabel(clock: MatchClock): string {
  const firstStoppage =
    clock.period === "first_half" &&
    clock.minute === 45 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  const secondStoppage =
    (clock.period === "second_half" || clock.period === "full_time") &&
    clock.minute === 90 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  if (firstStoppage || secondStoppage) {
    return `${clock.minute}+${clock.stoppageMinute}'`;
  }
  if (clock.period === "full_time") {
    return "90+";
  }
  return `${clock.minute}'`;
}

export function buildMatchConditions(seed: number): MatchReportConditions {
  return {
    referee: hashPick(seed, "referee", REFEREES),
    weather: hashPick(seed, "weather", WEATHER),
  };
}

type ReportCtx = { playerName: (playerId: PlayerId) => string };

export function buildMatchReport(
  events: readonly MatchEvent[],
  home: Squad,
  away: Squad,
  seed: number,
  ctx: ReportCtx,
): MatchReport {
  const goals: MatchReportGoal[] = [];
  const cards: MatchReportCard[] = [];

  for (const event of events) {
    if (event.type === "goal") {
      goals.push({
        minuteLabel: formatMatchMinuteLabel(event.clock),
        scorerName: ctx.playerName(event.scorer.playerId),
        assistName: event.assist ? ctx.playerName(event.assist.playerId) : undefined,
        teamId: event.scorer.teamId,
      });
      continue;
    }
    if (event.type === "foul" && event.card) {
      const color =
        event.card === "red" || event.card === "second_yellow" ? "red" : "yellow";
      cards.push({
        minuteLabel: formatMatchMinuteLabel(event.clock),
        playerName: ctx.playerName(event.fouler.playerId),
        color,
        teamId: event.fouler.teamId,
      });
      continue;
    }
    if (event.type === "card") {
      const color =
        event.color === "red" || event.color === "second_yellow" ? "red" : "yellow";
      cards.push({
        minuteLabel: formatMatchMinuteLabel(event.clock),
        playerName: ctx.playerName(event.player.playerId),
        color,
        teamId: event.player.teamId,
      });
    }
  }

  return {
    conditions: buildMatchConditions(seed),
    goals,
    cards,
    playerStats: aggregatePlayerMatchStats(events, home, away),
  };
}
