/**
 * Headless career playtest (agent playtest 2026-10-21, PRD 15 §15.7.1).
 *
 * Drives a fresh career through `simulateGameWeek` week by week — the same pipeline
 * the desk uses — with a scripted manager policy, and flags anomalies that a human
 * playtester would notice (transfer churn, flat board pressure, empty merch, DE text
 * in an EN career, placeholder names).
 */
import type { TeamId } from "@fussballmanager/shared";
import { loadTrainingPlanPreset } from "../development/training-plan-presets.ts";
import { leagueTablePlace } from "../economy/club-finances.ts";
import { hasMerchStockout } from "../economy/merchandising.ts";
import { setLocale } from "../i18n/index.ts";
import type { ClubEvent } from "../inbox/club-events.ts";
import { appendMatchdayClubEvents } from "../match/post-match-events.ts";
import { resolveFeatureCurtain } from "../narrative/career-presentation.ts";
import type { ProductGameMode } from "../narrative/game-mode.ts";
import type { CareerActTransition } from "../narrative/story-state.ts";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { formatFixtureResult, playerTableRow } from "../sim/league-week.ts";
import { sessionAfterWeekSimulation } from "../sim/fast-forward-to-month.ts";
import { simulateGameWeek } from "../sim/week-pipeline.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export type CareerPlaytestStrategy = "autopilot" | "youth";

export interface CareerPlaytestWeek {
  season: number;
  week: number;
  matchday: number;
  place: number;
  points: number;
  pressure: number;
  cash: number;
  squadAvgCa: number;
  squadCaRank: number;
  merchStockout: boolean;
  jobStatus: string;
  result?: string;
}

export interface CareerPlaytestAnomaly {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface CareerPlaytestReport {
  strategy: CareerPlaytestStrategy;
  mode: ProductGameMode;
  club: TeamId;
  weeks: CareerPlaytestWeek[];
  /** Last in-season week (before the season-end rollover). */
  final: CareerPlaytestWeek;
  /** Board verdict after the last matchday, when the season ended inside the run. */
  seasonEnd?: {
    lastResult?: string;
    jobStatus: string;
    pressure: number;
    summary?: string;
    /** Story Mode — frozen Act 1 → 2 transition (PRD 19). */
    actTransition?: CareerActTransition | null;
  };
  promoted: string[];
  anomalies: CareerPlaytestAnomaly[];
}

export interface CareerPlaytestOptions {
  strategy: CareerPlaytestStrategy;
  /** PRD 24 — default Regionalliga Manager. */
  mode?: ProductGameMode;
  /** Stop early (smoke runs). Default: until the football season ends. */
  maxWeeks?: number;
  now?: Date;
  onWeek?: (row: CareerPlaytestWeek) => void;
}

const MAX_SEASON_WEEKS = 60;
const YOUTH_PROMOTE_MIN_CA = 80;
/** Same player moving clubs more often than this in one season counts as churn. */
const CHURN_MOVES = 2;
/** Club and player names keep their umlauts — look for German words, not letters. */
const GERMAN_HINT =
  /\b(und|nicht|der|die|das|dem|mit|für|Spieler|Verletzt|Tore?|Vorlagen?|Woche|Wo\.|legt|Vorstand|Liga|Anfrage)\b/;
const PLACEHOLDER_HINT = /\?!|\{[a-z]+\}|: Spieler$|\bundefined\b|\bNaN\b/;
const AI_TRANSFER = /^Liga: (.+?) · /;

function playerCa(player: Player): number {
  return estimateCa(player.attributes, player.position);
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function squadCaStanding(session: GameSession): { avg: number; rank: number } {
  const clubId = session.league.player_club_id;
  const own = average(
    session.players.filter((p) => p.club_id === clubId && p.squad_status === "pro").map(playerCa),
  );
  const byClub = new Map<string, number[]>();
  for (const player of session.rivalPlayers) {
    if (!player.club_id || player.squad_status !== "pro") continue;
    if (!session.league.club_ids.includes(player.club_id as TeamId)) continue;
    const list = byClub.get(player.club_id) ?? [];
    list.push(playerCa(player));
    byClub.set(player.club_id, list);
  }
  const better = [...byClub.values()].filter((cas) => average(cas) > own).length;
  return { avg: Math.round(own), rank: better + 1 };
}

/** Policy "youth": the agent's survival route minus camps/market — promote strong U19s on day one. */
function promoteStrongYouth(session: GameSession): { session: GameSession; promoted: string[] } {
  const promoted: string[] = [];
  const players = session.players.map((player) => {
    if (player.squad_status !== "u19" || playerCa(player) < YOUTH_PROMOTE_MIN_CA) return player;
    promoted.push(`${formatPlayerName(player)} (${player.position}, CA ${playerCa(player)})`);
    return { ...player, squad_status: "pro" as const };
  });
  return { session: { ...session, players }, promoted };
}

function weekRow(session: GameSession, result?: string): CareerPlaytestWeek {
  const row = playerTableRow(session.league);
  const standing = squadCaStanding(session);
  return {
    season: session.season,
    week: session.week,
    matchday: row?.played ?? 0,
    place: leagueTablePlace(session.league),
    points: row?.points ?? 0,
    pressure: Math.round(session.board.pressure),
    cash: Math.round(session.finances.cash),
    squadAvgCa: standing.avg,
    squadCaRank: standing.rank,
    merchStockout: hasMerchStockout(session.stadium),
    jobStatus: session.board.job_status,
    result,
  };
}

function newEvents(before: readonly ClubEvent[], after: readonly ClubEvent[]): ClubEvent[] {
  const seen = new Set(before.map((event) => event.id));
  return after.filter((event) => !seen.has(event.id));
}

function mandatoryPlaceTarget(session: GameSession): number | null {
  const objective = session.board.objectives.find(
    (entry) => entry.mandatory && entry.kind === "league_place_max",
  );
  return objective?.target ?? null;
}

export function detectAnomalies(input: {
  weeks: readonly CareerPlaytestWeek[];
  events: readonly ClubEvent[];
  placeTarget: number | null;
  clubCount: number;
}): CareerPlaytestAnomaly[] {
  const anomalies: CareerPlaytestAnomaly[] = [];
  const { weeks, events, placeTarget, clubCount } = input;

  const moves = new Map<string, number>();
  for (const event of events) {
    const name = AI_TRANSFER.exec(event.message)?.[1];
    if (name) moves.set(name, (moves.get(name) ?? 0) + 1);
  }
  const churn = [...moves.entries()].filter(([, count]) => count > CHURN_MOVES);
  if (churn.length > 0) {
    anomalies.push({
      id: "ai_transfer_churn",
      severity: "medium",
      message: `Players moved clubs more than ${CHURN_MOVES}× in one season: ${churn
        .map(([name, count]) => `${name} (${count})`)
        .join(", ")}`,
    });
  }

  if (placeTarget != null) {
    const below = weeks.filter((row) => row.matchday >= 6 && row.place > placeTarget);
    if (below.length >= 4 && below.every((row) => row.pressure === below[0]!.pressure)) {
      anomalies.push({
        id: "board_pressure_flat",
        severity: "high",
        message: `Board pressure stayed at ${below[0]!.pressure}% for ${below.length} weeks below target place ${placeTarget}.`,
      });
    }
  }

  let stockoutRun = 0;
  let longestStockout = 0;
  for (const row of weeks) {
    stockoutRun = row.merchStockout ? stockoutRun + 1 : 0;
    longestStockout = Math.max(longestStockout, stockoutRun);
  }
  if (longestStockout >= 2) {
    anomalies.push({
      id: "merch_stockout",
      severity: "medium",
      message: `At least one merch SKU at 0 stock for ${longestStockout} consecutive weeks.`,
    });
  }

  const german = events.filter((event) => GERMAN_HINT.test(event.message));
  if (german.length > 0) {
    anomalies.push({
      id: "i18n_german_in_en",
      severity: "high",
      message: `${german.length} club events look German in an EN career, e.g. "${german[0]!.message}"`,
    });
  }

  const placeholders = events.filter((event) => PLACEHOLDER_HINT.test(event.message));
  if (placeholders.length > 0) {
    anomalies.push({
      id: "placeholder_text",
      severity: "medium",
      message: `${placeholders.length} club events contain placeholders, e.g. "${placeholders[0]!.message}"`,
    });
  }

  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (first && last && last.cash > first.cash && last.squadCaRank >= clubCount - 1 && last.place > (placeTarget ?? clubCount)) {
    anomalies.push({
      id: "cash_without_lever",
      severity: "medium",
      message: `Cash grew ${(first.cash / 1e6).toFixed(2)}M → ${(last.cash / 1e6).toFixed(2)}M while the squad ranks ${last.squadCaRank}/${clubCount} by CA and sits #${last.place}.`,
    });
  }

  return anomalies;
}

export async function runCareerPlaytest(options: CareerPlaytestOptions): Promise<CareerPlaytestReport> {
  setLocale("en");
  const mode = options.mode ?? "regionalliga_manager";
  let session = newGameSession(options.now ?? new Date("2026-08-01T12:00:00Z"), { mode });
  let promoted: string[] = [];
  if (options.strategy === "youth") {
    const step = promoteStrongYouth(session);
    session = step.session;
    promoted = step.promoted;
  }

  const placeTarget = mandatoryPlaceTarget(session);
  const weeks: CareerPlaytestWeek[] = [];
  const events: ClubEvent[] = [];
  let seasonEnd: CareerPlaytestReport["seasonEnd"];
  const limit = Math.min(options.maxWeeks ?? MAX_SEASON_WEEKS, MAX_SEASON_WEEKS);

  for (let index = 0; index < limit; index++) {
    if (!resolveFeatureCurtain(session.storyState).auto_training) {
      session = { ...session, trainingPlan: loadTrainingPlanPreset(session.trainingPlanPresets, 1) };
    }
    const before = session.clubEvents;
    const result = await simulateGameWeek(session);
    let next = sessionAfterWeekSimulation(result.session);
    let resultLine: string | undefined;
    if (result.playerFixture) {
      resultLine = formatFixtureResult(result.playerFixture, next.league.player_club_id);
      next = {
        ...next,
        clubEvents: appendMatchdayClubEvents(
          next.clubEvents,
          next.season,
          next.week,
          result.playerFixture,
          next.league.player_club_id,
          result.matchdayStats,
        ),
      };
    }
    events.push(...newEvents(before, next.clubEvents));
    session = next;
    if (result.seasonEnded) {
      seasonEnd = {
        lastResult: resultLine,
        jobStatus: session.board.job_status,
        pressure: Math.round(session.board.pressure),
        summary: session.board.last_evaluation?.summary,
        actTransition: session.storyState.act_transition,
      };
      break;
    }
    const row = weekRow(session, resultLine);
    weeks.push(row);
    options.onWeek?.(row);
    if (session.board.job_status === "dismissed") break;
  }

  const final = weeks[weeks.length - 1] ?? weekRow(session);
  return {
    strategy: options.strategy,
    mode,
    club: session.league.player_club_id,
    weeks,
    final,
    seasonEnd,
    promoted,
    anomalies: detectAnomalies({
      weeks,
      events,
      placeTarget,
      clubCount: session.league.club_ids.length,
    }),
  };
}

export function renderCareerPlaytestMarkdown(report: CareerPlaytestReport): string {
  const lines = [
    `# Career playtest — ${report.strategy}`,
    "",
    "Generated by `scripts/run-career-playtest.ts` (headless, real week pipeline, EN locale).",
    "",
    `Final: **#${report.final.place}**, ${report.final.points} pts after MD ${report.final.matchday}, ` +
      `board pressure ${report.final.pressure}%, job ${report.final.jobStatus}, cash € ${(report.final.cash / 1e6).toFixed(2)}M.`,
    "",
  ];
  if (report.seasonEnd) {
    lines.push(
      (report.seasonEnd.lastResult ? `Last matchday: ${report.seasonEnd.lastResult}. ` : "") +
        `Season end: job **${report.seasonEnd.jobStatus}**, pressure ${report.seasonEnd.pressure}%` +
        (report.seasonEnd.summary ? ` — ${report.seasonEnd.summary}` : "") +
        ".",
      "",
    );
  }
  if (report.promoted.length > 0) {
    lines.push("Promoted on day one:", "", ...report.promoted.map((name) => `- ${name}`), "");
  }
  lines.push("## Anomalies", "");
  if (report.anomalies.length === 0) lines.push("None.");
  for (const anomaly of report.anomalies) {
    lines.push(`- **${anomaly.severity}** \`${anomaly.id}\` — ${anomaly.message}`);
  }
  lines.push(
    "",
    "## Weeks",
    "",
    "| Week | MD | Place | Pts | Pressure | Cash | Squad CA (rank) | Merch out | Result |",
    "|---|---|---|---|---|---|---|---|---|",
    ...report.weeks.map(
      (row) =>
        `| ${row.week} | ${row.matchday} | ${row.place} | ${row.points} | ${row.pressure}% | ${(row.cash / 1e6).toFixed(2)}M | ${row.squadAvgCa} (${row.squadCaRank}) | ${row.merchStockout ? "yes" : ""} | ${row.result ?? ""} |`,
    ),
    "",
  );
  return lines.join("\n");
}
