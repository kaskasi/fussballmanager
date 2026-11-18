# PRD 35 — Season calendar

**Status:** In progress · 2026-11-18 · Phase 4 of PRD 30.
**Features:** F11.1 (PRD 10, summer flow moves into the pre-season).
**Touches:** PRD 02 (growth per year), PRD 05 (windows), PRD 11 (weekly vs.
yearly amounts), PRD 18 Ruhephase (quiet weeks), PRD 08.10 (save bump).

## 1. Problem

The internal week is the matchday: weeks 1–34 are matchdays 1–34. A pre-season
exists only for a new career (weeks −1 and 0), and week 34 rolls straight into
matchday 1. From season 2 on there is no summer or winter break, the summer
window overlaps matchdays 1–2, and there is no free week for cups (phase 5) or
friendlies (phase 8).

## 2. Season template

Every season, including the first, runs the same **52-week** template.
PRD 30 sketched about 50 weeks (4 + 34 + 9 + 2 + 1). The two extra weeks are
a summer break at the start, so that one season is exactly one ISO year: the
mapping season week → ISO week → civil date is the same every season and
nothing drifts. The existing career-week indices (`careerWeekIndex`,
`merchCareerWeekIndex` = `(season − 1) × 52 + week`) and the 13 four-week
finance months (PRD 11) already assume 52 weeks.

Season week 1 = ISO week 27 (early July). `isoWeek = ((26 + week − 1) mod 52) + 1`.

| Season weeks | ISO weeks | Kind | Notes |
|---|---|---|---|
| 1–2 | 27–28 | `summer_break` | Squad on holiday. Nothing scheduled. |
| 3–6 | 29–32 | `preseason` | Summer window. Summer checklist (F11.1). New careers start in week 3. Phase 5: regional cup early rounds and national cup round 1; phase 8: friendlies. |
| 7–25 | 33–51 | `league` ×17, `cup` ×2 | First half. Cup weeks after matchdays 5 and 12. |
| 26–27 | 52, 1 | `winter_break` | Winter window opens (ISO 52, 1, 2). |
| 28–51 | 2–25 | `league` ×17, `cup` ×7 | Second half. Cup weeks after every second matchday from 19 to 29, then after 31. |
| 52 | 26 | `season_end` | Awards, intake, retirement, promotion and relegation, rollover. |

Totals: 34 league, 9 cup, 4 pre-season, 2 winter break, 2 summer break,
1 season end. Cup weeks are free weeks until phase 5 (no match, normal
training) and become friendly weeks after phase 8.

Transfer windows keep today's lengths: summer = the 4 pre-season weeks
(ISO 29–32, was 33–36), winter = ISO 52, 1, 2 (was 2–4). Seven window weeks
per year, as today, so the AI market volume per year does not change.

New careers start in week 3, the first pre-season week: four preparation
weeks instead of today's two (playtest 2026-10-09 chose two). Reason: every
season has the same pre-season, and a new career keeps four window weeks for
the opening market, as today. The extra two weeks cost one click each with
"simulate until next event" (§6). Owner check in the PR.

## 3. `SeasonSchedule`

`src/sim/season-schedule.ts`, pure and deterministic (no seed needed; the
template is fixed):

```ts
type SeasonSlotKind =
  | "summer_break" | "preseason" | "league" | "cup" | "winter_break" | "season_end";
interface SeasonSlot { week: number; isoWeek: number; kind: SeasonSlotKind; matchday?: number; cupRound?: number }
interface SeasonSchedule {
  season: number;
  slots: readonly SeasonSlot[];   // index = week − firstWeek
  firstWeek: number;              // first stored week of the season
  careerStartWeek: number;        // season 1 only
  seasonEndWeek: number;          // the week whose advance rolls the season
  weeksPerSeason: number;
}
```

Every question about the calendar goes through it: `slotFor(season, week)`,
`isLeagueWeek`, `matchdayForWeek`, `weekForMatchday`, `seasonEndWeek`,
`leagueWeeksBefore(week)` (= matchdays reached), `nextSeasonStartWeek`,
`advanceWeek`. `isLeagueMatchWeek`, `isMatchSaturday`, `LEAGUE_*_WEEK`,
`SEASON_END_WEEK`, `CAREER_START_WEEK` and `PRESEASON_WEEKS` are gone from
call sites.

Slice 1 adds a `legacy` template that reproduces today's layout exactly
(season 1: weeks −1..34, later seasons 1..34, week = matchday, week 34 is both
the last league week and the season-end week) and switches every call site to
the schedule. Slice 2 swaps the default to the 52-week template.

Code that used a raw week number as "how far into the season" (story beats,
tutorial gates, retirement announcement, early pacing) reads the matchday
reached (`leagueWeeksBefore`) or the weeks since the pre-season started
instead, so the beat lands at the same point of the season.

## 4. Per-week systems: normalization

A 52-week season runs 52 weekly ticks instead of 34. Rule (PRD 30): per-year
growth and finance totals stay within ±5 % of today.

**Choice: scale weekly rates by `SEASON_RATE_SCALE = 34 / 52`** (exported
from the schedule as `LEGACY_WEEKS_PER_SEASON / weeksPerSeason`). The
alternative was a reduced load in break weeks (pre-season = fitness only,
winter = rest, no recurring cash). It is not clear-cut; scaling wins because:

- It is one constant in two places (growth, recurring finance lines) instead
  of a per-kind table that every new slot kind (cups in phase 5, friendlies in
  phase 8) would have to extend and retune.
- Break weeks with no cash movement would make the cash chart flat for
  18 weeks a year, and no training gain in 9 free cup weeks would make those
  weeks pointless for the manager.
- Reduced load would still need per-kind rates to hit ±5 %, because the
  18 non-league weeks are not split evenly between "rest" and "fitness".

What is scaled:

| System | Scaled | Why |
|---|---|---|
| Growth: training gain (`learningBase`) and age decay (`decayPerWeek`) | × 34/52 | Per-year development unchanged. PRD 02 keeps the yearly decline table; the effective decline stays 34/52 of it, as today. |
| Recurring finance lines: sponsorship, TV, sponsor inventory, player wages, staff wages, maintenance, concessions | × 34/52 | Per-year cash unchanged. Contract `wage_weekly` stays the nominal rate shown on contracts; the ledger books the scaled amount. |
| Merchandising weekly demand | × 34/52 | Per-year units and cash unchanged; stock and lead times stay in real weeks. |
| Loan interest and repayment per week | × 34/52 | Same cost per year; the loan runs the same number of seasons. |
| Spend runway and other weekly cash projections | × 34/52 | They project what the ledger books. |

What is not scaled, on purpose (real time, not per-year budgets):

- Injury recovery, fitness, morale drift toward baseline, contract and
  cooldown durations: they are measured in weeks or days of real time.
- Scout jobs and trips: they advance per working day. More weeks per year
  give more scouting per season; quiet weeks are when the manager scouts
  (PRD 18). Reviewed after the long run.
- Matchday income (tickets, hospitality per home match), league prize and TV
  bonus: per match or per season, unchanged by calendar length.

Regression test (`src/sim/season-calendar-normalization.test.ts`): one
simulated year of growth (fixed player set, fixed seed, every slot of the
season) and of weekly finance lines, under the legacy 34-week schedule and
the 52-week template. Totals within ±5 %.

## 5. Stored values and migration

`DAYS_PER_SEASON` becomes `weeksPerSeason × 7` (364). `calendarDayIndex`
clamps the week to `1..weeksPerSeason`. Saved day indices
(`contract_talks_locked_until_day`, `contract_underpaid_since_day`,
`sustained_career_day`, merch `*_career_day`, scout job days) and the stored
`state.week` change meaning.

Migration (one `SAVE_VERSION` bump in slice 2) maps an old week to the new
week with the same matchday: old week `w` in 1..34 → the league week of
matchday `w`; old pre-season weeks −1 and 0 → the two weeks before matchday 1.
Day indices are decoded with the old 34-week season, the week is mapped, and
re-encoded. Career-week stamps (`(season − 1) × 52 + week`) are mapped the
same way. Short-lived stamps that only gate a cooldown are mapped where they
are cheap to find and otherwise left to expire (PRD 08.10: pre-release saves
have no legacy guarantee).

## 6. UI

- Calendar (`season-timeline.ts`, `month-grid.ts`, `month-journal.ts`):
  shows every slot kind, with the breaks and cup weeks as their own bands.
- Phase label: summer break, pre-season, matchday n, free week (cup), winter
  break, season end.
- **Simulate until next event:** one click advances through consecutive quiet
  weeks (summer break, free cup weeks, winter break without a pending inbox
  item, decision or window opening) and stops at the next league week,
  window change, season end or inbox interrupt. A 52-week year does not cost
  more NEXT presses than a 34-week year.

## 7. Slices

1. `SeasonSchedule` with the legacy template; every call site switched.
   No behavior change: existing tests unchanged and green.
2. 52-week template as default, normalization (§4) and its regression test,
   migration (§5) with the save bump, calendar UI and skip-quiet-weeks (§6).

## 8. Acceptance

- Three seasons in a row each have a pre-season, a winter break and a season
  end (test on the schedule and on the long run).
- Per-year growth and finance totals within ±5 % of the legacy layout.
- Existing calendar tests updated, not deleted.
- `scripts/longrun-world.ts --seasons=10` passes its invariants.
- Budgets (PRD 30): week sim ≤ +30 %, gzipped save ≤ 2× the 2026-10-29
  baseline.

## 9. Not covered

- Cup fixtures (phase 5) and friendlies (phase 8) in the reserved weeks.
- Per-kind training loads (pre-season fitness focus). Possible later on top of
  the scale.
