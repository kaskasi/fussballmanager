/**
 * PRD 35 (PRD 30 phase 4) — the season calendar as data.
 *
 * Every question about the calendar ("is this a match week", "which matchday is
 * this", "when does the season end") reads a `SeasonSchedule`. The schedule is a
 * fixed template, so it needs no seed and is the same for every save.
 *
 * Two templates:
 * - `legacy`: the layout before PRD 35. Season 1 runs weeks −1..34, later seasons
 *   1..34; week = matchday; week 34 is both the last league week and the
 *   season-end week. Kept for the save migration and the normalization test.
 * - `standard`: 52 weeks — summer break, pre-season, 34 league weeks with 9 free
 *   cup weeks, a winter break and a season-end week (PRD 35 §2).
 */

export type SeasonSlotKind =
  | "summer_break"
  | "preseason"
  | "league"
  | "cup"
  | "winter_break"
  | "season_end";

export interface SeasonSlot {
  week: number;
  /** ISO calendar week (1–52) shown as "KW". */
  isoWeek: number;
  kind: SeasonSlotKind;
  matchday?: number;
  cupRound?: number;
}

export type SeasonTemplateId = "legacy" | "standard";

export interface SeasonSchedule {
  template: SeasonTemplateId;
  season: number;
  /** Ordered slots; `slots[i].week === firstWeek + i`. */
  slots: readonly SeasonSlot[];
  /** First week of this season (season 1: the career start week). */
  firstWeek: number;
  /** Week a new career starts in (season 1). */
  careerStartWeek: number;
  /** The week whose advance rolls over to the next season. */
  seasonEndWeek: number;
  /** Weekly ticks in a regular (non-first) season. */
  weeksPerSeason: number;
  /** ISO week of the template's week 1. */
  isoWeekOfWeekOne: number;
  /** ISO weeks with the summer / winter transfer window open. */
  summerWindowIsoWeeks: readonly number[];
  winterWindowIsoWeeks: readonly number[];
}

export const ISO_WEEKS_PER_YEAR = 52;
export const LEAGUE_MATCHDAYS = 34;
/** Weekly ticks per season before PRD 35; per-week rates were tuned to it. */
export const LEGACY_WEEKS_PER_SEASON = 34;

/** The template every season runs. */
export const ACTIVE_SEASON_TEMPLATE: SeasonTemplateId = "standard";

function wrapIsoWeek(raw: number): number {
  let iso = raw;
  while (iso < 1) iso += ISO_WEEKS_PER_YEAR;
  while (iso > ISO_WEEKS_PER_YEAR) iso -= ISO_WEEKS_PER_YEAR;
  return iso;
}

interface TemplateSpec {
  isoWeekOfWeekOne: number;
  /** Week kinds for weeks 1..n of a regular season ("L" = league, "C" = cup). */
  pattern: readonly SeasonSlotKind[];
  /** Season 1 only: pre-season weeks before week 1 (legacy). */
  season1LeadWeeks: number;
  careerStartWeek: number;
  /** Week whose advance rolls the season (legacy: the last league week). */
  seasonEndWeek: number;
  summerWindowIsoWeeks: readonly number[];
  winterWindowIsoWeeks: readonly number[];
}

function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}

function parsePattern(code: string): SeasonSlotKind[] {
  return [...code.replace(/\s+/g, "")].map((char) => (char === "L" ? "league" : "cup"));
}

/** First half: cup weeks after matchdays 5 and 12. */
const STANDARD_FIRST_HALF = parsePattern("LLLLLC LLLLLLLC LLLLL");
/** Second half: cup weeks after every second matchday from 19 to 29, then after 31. */
const STANDARD_SECOND_HALF = parsePattern("LLC LLC LLC LLC LLC LLC LLC LLL");

const TEMPLATES: Record<SeasonTemplateId, TemplateSpec> = {
  legacy: {
    isoWeekOfWeekOne: 35,
    pattern: repeat<SeasonSlotKind>("league", LEAGUE_MATCHDAYS),
    season1LeadWeeks: 2,
    careerStartWeek: -1,
    seasonEndWeek: LEAGUE_MATCHDAYS,
    summerWindowIsoWeeks: [33, 34, 35, 36],
    winterWindowIsoWeeks: [2, 3, 4],
  },
  standard: {
    isoWeekOfWeekOne: 27,
    pattern: [
      ...repeat<SeasonSlotKind>("summer_break", 2),
      ...repeat<SeasonSlotKind>("preseason", 4),
      ...STANDARD_FIRST_HALF,
      ...repeat<SeasonSlotKind>("winter_break", 2),
      ...STANDARD_SECOND_HALF,
      "season_end",
    ],
    season1LeadWeeks: 0,
    careerStartWeek: 3,
    seasonEndWeek: 52,
    summerWindowIsoWeeks: [29, 30, 31, 32],
    winterWindowIsoWeeks: [52, 1, 2],
  },
};

function buildSlots(spec: TemplateSpec, season: number): SeasonSlot[] {
  const slots: SeasonSlot[] = [];
  const lead = season === 1 ? spec.season1LeadWeeks : 0;
  for (let i = lead; i > 0; i -= 1) {
    const week = 1 - i;
    slots.push({ week, isoWeek: wrapIsoWeek(spec.isoWeekOfWeekOne + week - 1), kind: "preseason" });
  }
  let matchday = 0;
  let cupRound = 0;
  spec.pattern.forEach((kind, index) => {
    const week = index + 1;
    const slot: SeasonSlot = { week, isoWeek: wrapIsoWeek(spec.isoWeekOfWeekOne + week - 1), kind };
    if (kind === "league") slot.matchday = ++matchday;
    if (kind === "cup") slot.cupRound = ++cupRound;
    slots.push(slot);
  });
  if (season === 1) {
    return slots.filter((slot) => slot.week >= spec.careerStartWeek);
  }
  return slots;
}

const scheduleCache = new Map<string, SeasonSchedule>();

/** The schedule of one season (cached; the template is fixed). */
export function seasonSchedule(
  season: number,
  template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE,
): SeasonSchedule {
  const s = Math.max(1, Math.round(season));
  const key = `${template}:${s === 1 ? 1 : 2}`;
  const cached = scheduleCache.get(key);
  if (cached) return cached.season === s ? cached : { ...cached, season: s };
  const spec = TEMPLATES[template];
  const slots = buildSlots(spec, s);
  const schedule: SeasonSchedule = {
    template,
    season: s,
    slots,
    firstWeek: slots[0]!.week,
    careerStartWeek: spec.careerStartWeek,
    seasonEndWeek: spec.seasonEndWeek,
    weeksPerSeason: spec.pattern.length,
    isoWeekOfWeekOne: spec.isoWeekOfWeekOne,
    summerWindowIsoWeeks: spec.summerWindowIsoWeeks,
    winterWindowIsoWeeks: spec.winterWindowIsoWeeks,
  };
  scheduleCache.set(key, schedule);
  return schedule;
}

function activeSpec(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): TemplateSpec {
  return TEMPLATES[template];
}

/**
 * The slot of a week. Season-independent: every season runs the same template;
 * season 1 only adds lead weeks (legacy) or starts later (standard), so a week
 * number names the same slot in every season it exists in.
 */
export function slotForWeek(week: number, template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): SeasonSlot {
  const w = Math.round(week);
  const regular = seasonSchedule(2, template);
  const source = w < regular.firstWeek ? seasonSchedule(1, template) : regular;
  const found = source.slots.find((slot) => slot.week === w);
  if (found) return found;
  const kind: SeasonSlotKind = w < regular.firstWeek ? "preseason" : "season_end";
  return { week: w, isoWeek: isoWeekForWeek(w, template), kind };
}

export function slotKind(week: number): SeasonSlotKind {
  return slotForWeek(week).kind;
}

/** League match in this week (the match is played on its Saturday). */
export function isLeagueWeek(week: number): boolean {
  return slotForWeek(week).kind === "league";
}

/** Matchday played in this week, or `undefined` outside league weeks. */
export function matchdayForWeek(week: number): number | undefined {
  return slotForWeek(week).matchday;
}

/** Week in which a matchday is played. */
export function weekForMatchday(matchday: number, template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  const md = Math.min(LEAGUE_MATCHDAYS, Math.max(1, Math.round(matchday)));
  const slot = seasonSchedule(2, template).slots.find((entry) => entry.matchday === md);
  return slot!.week;
}

export function leagueFirstWeek(): number {
  return weekForMatchday(1);
}

export function leagueLastWeek(): number {
  return weekForMatchday(LEAGUE_MATCHDAYS);
}

/** Matchdays whose week is at or before `week` (0 before matchday 1). */
export function matchdaysThrough(week: number): number {
  const w = Math.round(week);
  let count = 0;
  for (const slot of seasonSchedule(2).slots) {
    if (slot.week > w) break;
    if (slot.kind === "league") count += 1;
  }
  return count;
}

/** Week whose advance rolls the season over (intake, awards, promotion). */
export function seasonEndWeek(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return activeSpec(template).seasonEndWeek;
}

/** Week a new career starts in. */
export function careerStartWeek(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return activeSpec(template).careerStartWeek;
}

/** First week of a season (season 1: the career start week). */
export function seasonFirstWeek(season: number, template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return seasonSchedule(season, template).firstWeek;
}

/** Weekly ticks in a regular season. */
export function weeksPerSeason(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return activeSpec(template).pattern.length;
}

/**
 * Per-week rate scale (PRD 35 §4): per-year growth and recurring cash stay what
 * they were with the 34-week season. 1 for the legacy template.
 */
export function seasonRateScale(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return LEGACY_WEEKS_PER_SEASON / weeksPerSeason(template);
}

export const SEASON_RATE_SCALE = seasonRateScale();

/** Home league matches per season (half of the matchdays). */
const HOME_MATCH_WEEKS = LEAGUE_MATCHDAYS / 2;

/**
 * Scale for income that is larger in home-match weeks (concessions, merchandising)
 * in every other week (PRD 35 §4). Home-match weeks stay at 1: there are 17 in
 * both layouts. The other weeks share what 17 legacy weeks earned.
 */
export function offMatchWeekScale(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return (LEGACY_WEEKS_PER_SEASON - HOME_MATCH_WEEKS) / (weeksPerSeason(template) - HOME_MATCH_WEEKS);
}

export const OFF_MATCH_WEEK_SCALE = offMatchWeekScale();

/**
 * Position of a week on the matchday clock: matchdays reached (1–34) from the
 * first league week on, and 0, −1, … for the weeks before matchday 1. Story beats,
 * tutorial gates and early pacing that used to read the raw week (= matchday
 * before PRD 35) read this, so they land at the same point of the season.
 */
export function matchdayClock(week: number): number {
  const first = leagueFirstWeek();
  const w = Math.round(week);
  if (w < first) return w - first + 1;
  return matchdaysThrough(w);
}

/** Monotonic week counter across seasons. */
export function careerWeekOrdinal(season: number, week: number): number {
  return (Math.max(1, Math.round(season)) - 1) * weeksPerSeason() + Math.round(week);
}

export function seasonWeekFromOrdinal(ordinal: number): { season: number; week: number } {
  const perSeason = weeksPerSeason();
  const zero = Math.round(ordinal) - 1;
  return {
    season: Math.floor(zero / perSeason) + 1,
    week: (((zero % perSeason) + perSeason) % perSeason) + 1,
  };
}

/** No league match and nothing else scheduled (breaks, free cup weeks). */
export function isQuietWeek(week: number): boolean {
  const kind = slotKind(week);
  return kind === "summer_break" || kind === "winter_break" || kind === "cup";
}

/**
 * PRD 35 §5 migration: the standard week with the same matchday as a legacy week
 * (legacy week = matchday; weeks −1 and 0 = the two weeks before matchday 1).
 */
export function standardWeekForLegacyWeek(legacyWeek: number): number {
  const w = Math.round(legacyWeek);
  if (w >= 1) return weekForMatchday(Math.min(LEAGUE_MATCHDAYS, w), "standard");
  return weekForMatchday(1, "standard") + w - 1;
}

/** ISO calendar week of a season week. */
export function isoWeekForWeek(week: number, template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return wrapIsoWeek(activeSpec(template).isoWeekOfWeekOne + Math.round(week) - 1);
}

export function isoWeekOfWeekOne(template: SeasonTemplateId = ACTIVE_SEASON_TEMPLATE): number {
  return activeSpec(template).isoWeekOfWeekOne;
}

export function summerWindowIsoWeeks(): readonly number[] {
  return activeSpec().summerWindowIsoWeeks;
}

export function winterWindowIsoWeeks(): readonly number[] {
  return activeSpec().winterWindowIsoWeeks;
}

/** Advance one week; the season rolls over after its season-end week. */
export function advanceSeasonWeek(week: number): { nextWeek: number; footballSeasonEnded: boolean } {
  if (week >= seasonEndWeek()) {
    return { nextWeek: seasonFirstWeek(2), footballSeasonEnded: true };
  }
  return { nextWeek: week + 1, footballSeasonEnded: false };
}

/** Weeks of a season in order (season 1 starts at the career start week). */
export function seasonWeeks(season: number): number[] {
  return seasonSchedule(season).slots.map((slot) => slot.week);
}
