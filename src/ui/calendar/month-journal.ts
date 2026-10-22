/**
 * The calendar's side column (design.md §9.5): what happened in a month, week by week,
 * and what is still ahead. Data only — the screen formats and localizes.
 */
import type { TreterArticle, TreterEdition } from "../../media/kicker-digest.ts";
import type { ChronicleEntry } from "../../narrative/story-state.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { SATURDAY } from "../../sim/day-calendar.ts";
import { LEAGUE_FIRST_WEEK, LEAGUE_LAST_WEEK } from "../../sim/game-calendar.ts";
import { civilDateFromSession } from "../../sim/session-civil-date.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import type { CalendarMilestone } from "./calendar-milestones.ts";
import {
  compareSessionDays,
  dayPhase,
  playerMatch,
  seasonDays,
  type PlayerMatch,
  type SessionDay,
} from "./season-timeline.ts";

interface DayEntry {
  id: string;
  week: number;
  weekday: number;
  /** Civil day of the month. */
  day: number;
}

export type JournalEntry =
  | (DayEntry & { kind: "match"; match: PlayerMatch })
  | (DayEntry & { kind: "milestone"; label: string })
  | { kind: "transfer"; id: string; week: number; record: TransferRecord }
  | { kind: "news"; id: string; week: number; masthead: string; article: TreterArticle }
  | { kind: "chronicle"; id: string; week: number; entry: ChronicleEntry };

export interface JournalWeek {
  week: number;
  entries: JournalEntry[];
}

export interface MonthSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  transfers: number;
  /** League matches in this month not yet played. */
  remaining: number;
}

export interface MonthJournal {
  /** Soonest first. */
  upcoming: JournalEntry[];
  /** Newest week first; inside a week, newest day first, then the week's records. */
  past: JournalWeek[];
  summary: MonthSummary;
}

const OWN_TRANSFER_KINDS = new Set<TransferRecord["kind"]>(["in", "out", "loan_out", "loan_return"]);

function leadArticle(edition: TreterEdition): TreterArticle | undefined {
  return [...edition.articles].sort((left, right) => right.priority - left.priority)[0];
}

function entryWeekday(entry: JournalEntry): number {
  return entry.kind === "match" || entry.kind === "milestone" ? entry.weekday : 0;
}

export function buildMonthJournal(input: {
  season: number;
  year: number;
  monthIndex: number;
  today: SessionDay;
  league: LeagueState;
  transfers?: readonly TransferRecord[];
  editions?: readonly TreterEdition[];
  chronicle?: readonly ChronicleEntry[];
  milestones?: readonly CalendarMilestone[];
  upcomingLimit?: number;
}): MonthJournal {
  const { season, year, monthIndex, today, league } = input;
  const inMonth = (week: number, weekday: number) => {
    const civil = civilDateFromSession(season, week, weekday);
    return civil.year === year && civil.monthIndex === monthIndex ? civil.day : null;
  };

  const monthWeeks = new Set<number>();
  for (const [key, day] of seasonDays(season)) {
    if (key.startsWith(`${year}-${monthIndex}-`)) monthWeeks.add(day.week);
  }
  const lived = (week: number) => monthWeeks.has(week) && week <= today.week;

  const past: JournalEntry[] = [];
  const upcoming: JournalEntry[] = [];
  const summary: MonthSummary = {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    transfers: 0,
    remaining: 0,
  };

  for (let week = LEAGUE_FIRST_WEEK; week <= LEAGUE_LAST_WEEK; week += 1) {
    const day = inMonth(week, SATURDAY);
    const match = day == null ? undefined : playerMatch(league, week);
    if (day == null || !match) continue;
    const entry: JournalEntry = { kind: "match", id: `match-${week}`, week, weekday: SATURDAY, day, match };
    if (match.result) {
      past.push(entry);
      summary.played += 1;
      summary[match.result.outcome === "win" ? "won" : match.result.outcome === "draw" ? "drawn" : "lost"] += 1;
      summary.goalsFor += match.result.goalsFor;
      summary.goalsAgainst += match.result.goalsAgainst;
    } else if (dayPhase({ week, weekday: SATURDAY }, today) !== "past") {
      upcoming.push(entry);
      summary.remaining += 1;
    }
  }

  for (const milestone of input.milestones ?? []) {
    if (milestone.season !== season) continue;
    const day = inMonth(milestone.week, milestone.weekday);
    if (day == null) continue;
    const entry: JournalEntry = {
      kind: "milestone",
      id: milestone.id,
      week: milestone.week,
      weekday: milestone.weekday,
      day,
      label: milestone.label,
    };
    (dayPhase(milestone, today) === "past" ? past : upcoming).push(entry);
  }

  for (const record of input.transfers ?? []) {
    if (record.season !== season || !OWN_TRANSFER_KINDS.has(record.kind) || !lived(record.week)) continue;
    past.push({ kind: "transfer", id: record.id, week: record.week, record });
    summary.transfers += 1;
  }

  for (const edition of input.editions ?? []) {
    const article = edition.season === season && lived(edition.week) ? leadArticle(edition) : undefined;
    if (!article) continue;
    past.push({
      kind: "news",
      id: `news-${edition.season}-${edition.week}`,
      week: edition.week,
      masthead: edition.masthead,
      article,
    });
  }

  for (const entry of input.chronicle ?? []) {
    if (entry.season !== season || !lived(entry.week)) continue;
    past.push({ kind: "chronicle", id: entry.id, week: entry.week, entry });
  }

  const weeks = new Map<number, JournalEntry[]>();
  for (const entry of past) {
    const list = weeks.get(entry.week) ?? [];
    list.push(entry);
    weeks.set(entry.week, list);
  }

  upcoming.sort((left, right) =>
    compareSessionDays(
      { week: left.week, weekday: entryWeekday(left) },
      { week: right.week, weekday: entryWeekday(right) },
    ),
  );

  return {
    upcoming: upcoming.slice(0, input.upcomingLimit ?? 5),
    past: [...weeks.entries()]
      .sort(([left], [right]) => right - left)
      .map(([week, entries]) => ({
        week,
        entries: entries.sort((left, right) => entryWeekday(right) - entryWeekday(left)),
      })),
    summary,
  };
}
