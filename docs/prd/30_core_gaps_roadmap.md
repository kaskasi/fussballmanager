# /docs/prd/30_core_gaps_roadmap.md

**Version:** 1.0
**Last Updated:** 2026-10-29
**Status:** Active — multi-session implementation plan

---

## Purpose

A gap review on 2026-10-29 (common sense, not PRD-driven) found features that
any football-manager player expects and the build lacks. This doc is the plan
to close them. It is split into phases that fit one to four sessions each, and
it is the hand-off point between sessions: the status board below is the
source of truth for what is done and what is next.

Where this plan contradicts an older PRD's scope line (PRD 10 milestones,
PRD 12 "Out" list), this plan wins. The phase that touches such a line updates
the older PRD in its first commit.

---

## Decisions (owner, 2026-10-29)

| Topic | Decision |
|---|---|
| Phase order | 1 World longevity → 2 Pyramid → 3 Suspensions → 4 Season calendar → 5 Cups → 6 In-match management → 7–11 |
| League pyramid | Up to a fictional top flight: three new tiers above Regionalliga Nord, five tiers in total |
| Cups | Regional cup (tiers 4–5) and national cup (all tiers); the regional winner qualifies for next season's national cup |
| Cup dates | Dedicated cup weeks with no league game. "At most one competitive match per club per week" stays an invariant |
| Season breaks | Every season gets a pre-season (friendlies, summer window) and a winter break (winter window) |

Phase 4 (calendar) was not on the original gap list. Cups and friendlies need
it, so it sits between phases 3 and 5.

---

## Status board

| # | Phase | Status | Phase PRD | Est. sessions | Depends on |
|---|---|---|---|---|---|
| 1 | World longevity: retirement, AI youth, roster upkeep | In progress (slice 3/3, CA drift open) | [31](31_world_longevity.md) | 2 | — |
| 2 | League pyramid (5 tiers) + season archive | Not started | — | 3–4 | 1 |
| 3 | Suspensions | Not started | — | 1 | — |
| 4 | Season calendar: breaks every season | Not started | — | 2–3 | — |
| 5 | Cups (regional + national) | Not started | — | 3 | 3, 4 (2 for national cup entrants) |
| 6 | In-match management | Not started | — | 2 | — |
| 7 | Club history and chronicle | Not started | — | 2 | 2, ideally 5 |
| 8 | Pre-season friendlies | Not started | — | 1 | 4 |
| 9 | Set-piece takers | Not started | — | 1 | — |
| 10 | Difficulty settings | Not started | — | 1 | — |
| 11 | Player happiness: promises, transfer requests | Not started | — | 2 | 2 (ambition) |

Status values: `Not started` · `In progress (slice x/y)` · `Done (PR #n)`.

---

## Session protocol

1. Read this status board and only your phase's section. Read the PRDs that
   section names; nothing else up front (AGENTS.md "Working cheaply").
2. First commit of a phase: write the phase PRD (next free number, one line in
   `INDEX.md`), apply the scope updates the phase lists, and set its status
   here to `In progress`.
3. Build in the listed slices. Each slice ends green: `npm run typecheck`,
   `npm run test:client`, and `npm test` when `shared/` or `server/` changed.
4. A persistent schema change bumps `SAVE_VERSION` and adds a migration file
   (PRD 08.10). One bump per slice that changes the schema.
5. Before ending a session, update the status board and the phase's
   **Progress** line (what is done, what is next, measured budgets), then
   commit and push.

---

## Cross-cutting rules

- **Determinism.** Every new roll uses seeds derived from `master_seed`, the
  way existing code does (`deriveWorldSeed`, `weeklySeed`, `masterSeed ^ season ^ salt`).
  No `Math.random`. Same seed and same decisions give the same world.
- **Engine.** Prefer the wrapper (`server/src/api/match-view.ts`, `shared/`).
  Any change under `server/src/engine/` follows ADR 0003: run
  `npm run play-calibration` and `npm run calibrate:career` before and after,
  and keep the target bands.
- **Strings.** All copy goes into de/en/zh-Hans with `npm run i18n:add`. No
  emoji outside Postfach (design.md §4.2). Existing violations met on the way
  (arrow emoji in `src/sim/promotion-relegation.ts`, yellow-card emoji in
  `src/match/post-match-events.ts`) are replaced with SVG icons when those
  files are touched.
- **UI.** Design tokens and the per-screen wireframe
  (`docs/prd/design/09.NN-*.md`). A new screen gets its wireframe file first.
- **Budgets.** Phases 1, 2 and 4 measure week-sim time and gzipped save size
  before and after. Default budget: week sim at most +30 %, save at most 2×
  the 2026-10-29 baseline. Record the numbers in the phase's Progress line.
- **Long-run guard.** Phase 1 adds a headless multi-season script
  (`scripts/longrun-world.ts`, run with `npx vite-node`). It is not part of
  the default vitest run: full-season sims were removed from tests for speed
  in 7933892. Every later phase re-runs it for at least 10 seasons and checks
  its invariants.

---

## Phase 1 — World longevity

**Problem.** Players age (`ageRivalPlayers`, `src/sim/rival-growth.ts:243`;
`runSeasonEnd`, `src/sim/season-end.ts:69`), but nobody retires and AI clubs
get no youth. The `retired.json` save slot exists
(`src/persistence/savegame-model.ts:103`) and is never written. After 6–8
seasons AI squads are full of veterans and league quality collapses. PRD 10
already lists this as F11.3.

**In**
- Retirement for all players, own and AI, executed at season end.
- Own players announce retirement in spring through Postfach, with one
  "persuade to play on" attempt.
- AI youth intake every season, plus roster upkeep (minimum squad size and
  position coverage).
- AI season minutes come from actual selection instead of shirt numbers.
- Retired players are written to `retired` with a career summary (used by
  phase 7).

**Out:** ex-pros returning as staff (F11.5), a free-agent pool (see open questions).

**Design**
- `src/development/retirement.ts`: `retirementChance(player, ctx)`. Zero
  below 31, then rising with age (outfield about 10 % at 33, 45 % at 35,
  85 % at 37+; keepers two years later; hard stop at 40). Modulated by CA
  decline against peak (`state.ca_history`, growth snapshots), low season
  minutes, `severe_injuries_logged`, and having no contract for next season.
  Age decay already exists (`decayPerWeek`, `src/development/growth-engine.ts:131`),
  so retirement follows real decline instead of age alone.
- Own players: on a fixed spring week (default matchday 28) players whose
  roll says "retires" get a Postfach decision (accept / persuade). Persuade
  chance depends on morale, minutes and an offered one-year contract; a
  failed attempt is final. Retirement runs in `runSeasonEnd` before the youth
  intake: the contract ends, mentorship links are cleared, and the wage bill drops.
- AI clubs, per club at season end: retire, then youth intake of 2–4 players
  (`generateYouthIntake`, quality scaled by club reputation and tier), then
  refill to `PLAYERS_PER_CLUB` (22) with positional minimums (2 GK, 6 DEF,
  6 MID, 4 ATT). Refill players come from a journeyman helper built on
  `generateProfessional` (`src/world/world-generator.ts:600`) at
  tier-appropriate strength. New ids must be unique and seed-stable.
- `rivalMinutesFromId` (`src/sim/rival-growth.ts:212`) assumes shirts 1–11
  start. Replace it with minutes from the selected XI (`buildCareerEngineSquad`
  in `shared/src/career-squad-bridge.ts`), so youth and refill players get
  real minutes. `indexRivalRoster` (`src/sim/rival-roster-match.ts`) must not
  depend on the `_<shirt>` id suffix for new players.
- Retired record (small): `{ id, name, birth, retired_season, last_club_id,
  career: [{ season, club_id, tier, apps, goals }] }`.

**Touch points:** `src/sim/season-end.ts`, `src/sim/rival-growth.ts`,
`src/sim/rival-roster-match.ts`, `src/youth/intake-generator.ts`,
`src/world/world-generator.ts`, `src/persistence/savegame-model.ts` and
`game-session.ts` (wire `retired`), `src/inbox/` (Postfach decision),
`src/transfers/` (exclude retired players from market, negotiations and
pre-contracts), `src/scouting/market-list.ts`, `src/ui/screens/PlayerProfile.tsx`.

**Scope doc updates:** PRD 10 F11.3 (milestone → now), PRD 07 (new state
fields), PRD 03 (AI intake).

**Slices**
1. Retirement roll, AI execution, `retired` persistence, long-run script.
2. AI youth intake, roster upkeep, selection-based AI minutes.
3. Own-player spring announcement, persuade flow, Postfach copy, "retires at
   season end" badge and career summary on the player profile.

**Acceptance**
- Long run over 20 seasons: AI mean age stays between 24 and 28 every
  season; players aged 35+ stay under 3 %; every AI roster keeps at least 18
  players and 2 GK; league-average CA drifts less than 10 % from season 1.
- No retired player appears in a market list, lineup or AI squad.
- Same seed gives the same retirements.

**Open questions (default if unanswered)**
- Free-agent pool for released or expired players? Default: not in phase 1;
  refill uses generated players.
- Retiring legends as staff? Default: no (F11.5 later), but the record is kept.

**Progress:** Slices 1–3 built (PRD 31, SAVE_VERSION 101). 20-season long run
(seed 2026): AI mean age 25.1–26.0, 35+ share at most 2.9 %, every AI roster
≥ 22 with ≥ 2 GK, no retired-id leaks, week sim 2.2 s (+5 %). Open: CA drift.
The PRD 02 growth curve never turns negative, so AI mean CA plateaus about 30 %
above season 1 from season 10 on (PRD 31 §8, §11, owner question). Save at
season 20 is 1.8 MB gzipped, but 1.1 MB of that is the never-answered autopilot
Postfach queue, not this phase. Next: owner decision on CA drift, then mark Done.

---

## Phase 2 — League pyramid (five tiers) and season archive

**Problem.** Only Regionalliga Nord and Oberliga Nord exist
(`src/economy/division-economy.ts`). `applyPromotionRelegation` computes
`regChampion` (`src/sim/promotion-relegation.ts:144`) and never uses it, so
winning the league leads nowhere. 21 non-test files hard-code the two
division ids.

**In**
- Three new fictional tiers above Regionalliga Nord: a national third tier, a
  second tier and a top flight. 18 clubs and 34 matchdays each, so every tier
  shares one league calendar.
- Generic N-tier promotion and relegation with per-boundary rules and playoffs.
- Tier economies (TV, sponsorship, prize money, staff wages, stadium
  defaults) and AI transfer budgets per tier.
- Generated clubs and rosters for the new tiers at tier-appropriate strength.
- Live tables for every tier and a tier switcher on the Leagues screen.
- Board objectives and job offers that know about tiers.
- Season archive capture (data only; the UI comes in phase 7).
- Applies to every game mode. Story Mode Act 3 ("national success", PRD 19)
  builds on it.

**Out:** other countries, the international cup (F10.6), stadium licensing as
a hard gate (see open questions), real league or club names.

**Design**
- `src/sim/league-pyramid.ts`: an ordered registry
  `{ id, tier, labelKey, clubCount: 18, boundaryBelow: { direct, playoff } }`.
  `DivisionEconomyId` becomes the registry's id union and `DIVISION_ECONOMY`
  gets three entries. Pairwise code (`REGIONALLIGA_ID`/`OBERLIGA_ID`,
  two-key `league_pools`, the pool checks in `normalizeLeagueState`,
  `src/persistence/league-state.ts`) becomes registry loops.
- Boundary defaults: top flight ↔ 2nd and 2nd ↔ 3rd: two direct plus a
  playoff (16th vs 3rd). 3rd tier ↔ Regionalliga Nord: two direct plus a
  playoff. Regionalliga ↔ Oberliga: unchanged (one direct plus a playoff).
- Names: invented and neutral. No "Bundesliga", "3. Liga" or other DFL/DFB
  marks (PRD 12 Out). The phase PRD picks them.
- World: generate 54 clubs with a new salt per tier (PRD 12 principle 4: new
  generators must not change existing entities), using nationwide city names
  (`src/world/real-cities.ts`), with reputation and squad strength rising by
  tier. Upgrade path for existing worlds: `src/world/upgrade-generated-world.ts`.
  ADR 0003 notes the engine is not scale-invariant, and "Elite ×1.3" is the
  highest calibrated strength. Top-flight rosters must stay inside the
  calibration bands, so run `npm run calibrate:career` with tier rosters.
- Week sim: the player's division stays engine-simulated per matchday
  (`advanceLeagueWeek`, `src/sim/league-week.ts:339`). Other tiers move from
  the season-end batch (`simulateFullDivisionSeason`,
  `src/sim/promotion-relegation.ts:90`) to the cheap per-matchday strength
  model (`simulateQuickMatchday`), so their tables are live. Results are
  persisted per division. Player stats stay limited to the player's division.
- Performance: about 1,200 extra AI players get weekly growth
  (`advanceRivalGrowthWeek`). If the budget breaks, fall back to "dormant
  tiers": tiers two or more away from the player's tier grow once per season
  in a batch, and switch back to weekly growth when they come within one tier.
- AI market across tiers: higher-tier clubs buy from lower tiers
  (`src/transfers/ai-transfer-market.ts` budgets per tier). The scouting
  market covers all tiers; check list performance.
- Board (PRD 23): objectives derive from the club's reputation rank inside its
  tier; promoted clubs default to "stay up". Job offers (`src/board/job-offers.ts`)
  can come from higher tiers after success.
- Season archive, appended at season end:
  `{ season, divisions: [{ id, table: [teamId, P, W, D, L, GF, GA, Pts], champion, promoted, relegated, playoff }], awards, own: { division, place, points, results } }`.
  Ids and numbers only, so it stays small. The own club's match results are
  kept so phase 7 can compute records (biggest win and so on) for past seasons.
  Phase 5 adds cup results.

**Touch points:** `src/economy/division-economy.ts`, `src/sim/league-divisions.ts`,
`src/sim/promotion-relegation.ts`, `src/sim/league-week.ts`,
`src/sim/league-standings.ts`, `src/sim/season-end.ts`,
`src/persistence/league-state.ts`, `src/world/world-generator.ts`,
`src/world/upgrade-generated-world.ts`, `src/sim/club-profiles.ts`,
`src/narrative/career-acts.ts`, `src/narrative/career-club-pick.ts`,
`src/economy/financing.ts`, `src/transfers/opening-transfer-market.ts`,
`src/ui/screens/LeaguesScreen.tsx`, `src/hub/hub-league-snippet.ts`,
`src/board/`, plus the rest of
`rg -l '"regionalliga-nord"|"oberliga-nord"|REGIONALLIGA_ID|OBERLIGA_ID' src shared server`.

**Scope doc updates:** PRD 12 (Out list, `division_id` union, club count),
PRD 10 (F10.8 → now, F10.3 text), PRD 11 (tier economies), PRD 23 (tier
objectives), PRD 19 (Act 3 = climbing the pyramid), PRD 24 (mode table).

**Slices**
1. Registry plus generic promotion and relegation over today's two tiers,
   with no behavior change. All hard-coded ids gone.
2. World generation for tiers 1–3, economy entries, calibration run, save migration.
3. Live quick-sim tables for all tiers, Leagues tier switcher, promotion out
   of Regionalliga Nord switched on.
4. AI market across tiers, board objectives, job offers, season archive,
   budgets measured.

**Acceptance**
- A club can climb from Oberliga Nord to top-flight champion inside one save
  (scripted test that forces results).
- Every tier has 18 clubs every season, and the 20-season long run passes.
- Tier strength order still holds after 20 seasons (mean CA tier 1 > 2 > 3 > 4 > 5).
- Budgets are met, or the dormant-tier fallback is active and documented.

**Open questions (default if unanswered)**
- Tier names: the phase PRD picks invented names.
- Stadium licensing (minimum capacity for promotion)? Default: no hard block
  in v1; a board warning plus a capacity cap on attendance.
- Clubs from all over the country relegated into "Regionalliga Nord":
  accepted as fiction (default), rather than drawing tiers 1–3 from northern
  cities only.

**Progress:** —

---

## Phase 3 — Suspensions

**Problem.** The engine shows cards (`server/src/engine/discipline.ts`; about
3 yellows and 0.15 reds per game after calibration, ADR 0003) and yellows are
counted (`state.season_yellow_cards`), but nobody is ever banned. Red cards
are not stored on the player at all. Eligibility only checks injuries
(`isPlayerMatchEligible`, `src/development/injury-roll.ts:22`).

**Rules (default)**
- Every fifth yellow in a competition: one-match ban in that competition.
- Second yellow (yellow-red): one match. Straight red: two matches.
- Bans are per competition: `"league"` now, cup ids from phase 5. Yellow counts
  reset at season end; open bans carry over to the same competition next season.
- AI players follow the same rules.

**Design**
- Player state: `season_red_cards` and
  `discipline: Record<CompetitionId, { yellows: number; ban_matches: number; reason?: "yellows" | "second_yellow" | "red" }>`.
- `shared/`: per-player card details must tell a second yellow from a straight
  red. The event already carries `color`; `PlayerSeasonStat`
  (`shared/src/match-player-stats.ts`) only has `redCards`. Add a sent-off
  reason.
- Apply after every match: own players in `src/sim/career-match-sync.ts`, AI
  in `src/sim/rival-matchday-stats.ts`. A ban counts down when the club plays a
  match in that competition, not per week.
- Eligibility: `isPlayerMatchEligible(player, competition = "league")`. Its
  callers are `src/sim/career-engine-squad.ts`, `src/match/auto-lineup.ts`
  and `src/match/lineup-board.ts`. For AI, filter in `squadWithRivalRoster`
  (`src/sim/rival-engine-squad.ts`).
- Quick-sim tiers have no player stats and so issue no bans. That is acceptable.

**UI:** a suspended badge (SVG card icon) on lineup cards, the status strip and
the squad table. A warning at four yellows ("one more and he misses the next
match"). A Postfach note after the match, a line in the match report, and the
opponent analysis lists the other side's banned players. Replace the yellow-card
emoji string in `src/match/post-match-events.ts`.

**Scope doc updates:** PRD 07 (state fields), PRD 10 (new F-id).

**Acceptance:** unit tests for thresholds, carry-over and per-competition
counts; AI squads never field a banned player; auto-lineup skips banned
players; engine golden tests unchanged (no engine edit).

**Open question (default):** red-card length by severity? Default: a flat two
matches, because the engine has no severity tag.

**Progress:** —

---

## Phase 4 — Season calendar: breaks every season

**Problem.** The internal week equals the matchday (`src/sim/game-calendar.ts`:
weeks 1–34 are matchdays 1–34). Pre-season (`PRESEASON_WEEKS = 2`) only
exists for a new career, and `advanceCalendarWeek` jumps from week 34 straight
to matchday 1. From season 2 on there is no summer break, the summer window
(KW 33–36) overlaps matchdays 1–2, and there is no room for cup weeks.

**Design**
- A `SeasonSchedule` built deterministically per season: ordered week slots
  `{ week, isoWeek, kind: "preseason" | "league" | "cup" | "winter_break" | "season_end", matchday?, cupRound? }`.
  Everything that asks "is this a match week" or "which matchday is this"
  reads it. That replaces `isLeagueMatchWeek`, `isMatchSaturday`,
  `LEAGUE_LAST_WEEK`, `SEASON_END_WEEK` and every `week === matchday`
  assumption (24 non-test files today: `rg 'isLeagueMatchWeek|isMatchSaturday|LEAGUE_LAST_WEEK|SEASON_END_WEEK|LEAGUE_FIRST_WEEK|CAREER_START_WEEK|PRESEASON_WEEKS'`).
- Default template, about 50 weeks (the phase PRD finalizes it):
  - 4 pre-season weeks with the summer window. Once phase 5 lands, the regional
    cup's early rounds and national cup round 1 sit here.
  - 34 league weeks.
  - 9 reserved cup weeks spread through the season. They are free weeks until
    phase 5, and friendly weeks after phase 8.
  - A 2-week winter break; the winter window opens in it.
  - 1 season-end week (awards, intake, retirement, promotion and relegation).
- Every season runs this template, not only the first. The summer checklist
  (`src/sim/summer-checklist.ts`) moves into the pre-season.

**Balance risk: per-week systems.** Growth (`src/development/growth-engine.ts`
learning and `decayPerWeek`), injuries, finances (weekly TV, sponsorship and
wages), merchandising, hospitality, loan servicing, morale drift and scout
jobs are all tuned to a 34-week year. A 50-week year would give about 45 %
more growth and cash per year. Rule: per-year totals stay within ±5 % of
today. The phase PRD chooses between scaling weekly rates by
`34 / weeksPerSeason` and giving break weeks a reduced load (pre-season =
fitness focus, winter = rest). Add a regression test that compares one
simulated year of growth and finances before and after.

**Stored day indices.** `calendarDayIndex` uses
`DAYS_PER_SEASON = SEASON_END_WEEK * 7` (`src/sim/calendar-days.ts`). Saved
values (`contract_talks_locked_until_day`, `contract_underpaid_since_day`,
scout jobs) change meaning, so the migration must convert them.

**Other touch points:** transfer windows (`src/sim/transfer-windows.ts`,
`nextTransferWindowStart`), youth intake timing (`src/youth/intake-generator.ts`
asserts `SEASON_END_WEEK`), story beats by week
(`src/narrative/career-act2-schedule.ts`), tutorial gates, Kicker delivery,
Ruhephase (PRD 18), calendar UI (`src/ui/calendar/season-timeline.ts`,
`month-grid.ts`, `month-journal.ts`), the hub training window, and
fast-forward (`src/sim/fast-forward-to-month.ts`). "Simulate until next event"
must skip quiet weeks in one click, so a longer year does not cost more NEXT presses.

**Scope doc updates:** PRD 05 (windows), PRD 11 (weekly vs. yearly amounts),
PRD 02 (growth per year), PRD 18 (Ruhephase), PRD 10 (F11.1 summer flow).

**Slices**
1. `SeasonSchedule` plus adapters that return today's layout (no behavior
   change), and every call site switched over.
2. The new template, normalized per-week systems, the day-index migration and
   the calendar UI.

**Acceptance:** three seasons in a row each have a pre-season, a winter break
and a season end; per-year growth and finance totals within ±5 %; existing
calendar tests updated, not deleted; the long run passes.

**Progress:** —

---

## Phase 5 — Cups

**In**
- Regional cup for tiers 4–5 (36 clubs): a preliminary round for the 8
  lowest-ranked Oberliga clubs (8 → 4), then a 32-club bracket (R32, R16, QF,
  SF, final).
- National cup with 64 clubs: tiers 1–3 (54 clubs), the previous season's
  regional cup winner and runner-up, and the best-placed remaining
  Regionalliga Nord clubs to fill 64. Six rounds.
- Single-leg ties with the lower-tier club at home; the final is on neutral
  ground. A draw per round (deterministic, announced in Postfach or the Kicker).
- Prize and TV money per round (PRD 11) and a gate split. A cup run feeds board
  objectives, fan mood and the press.
- Cup discipline uses the phase 3 competition key. Cup stats are separate from
  league stats.
- Cup results go into the season archive.

**Design**
- New module `src/competitions/` (`cup-definition.ts`, `cup-draw.ts`,
  `cup-round.ts`, `cup-state.ts`). Cup weeks come from `SeasonSchedule` (phase 4).
- The player's tie goes through the normal match flow (lineup, press, live
  match, report). Other ties use the quick strength model, which works across tiers.
- Draw after 90 minutes. Default: straight to penalties in the regional cup;
  extra time and penalties in the national cup. The engine only has two
  periods (`server/src/engine/step.ts`), so extra time needs an engine change
  (ADR 0003) or a wrapper continuation. A shootout can be a seeded
  wrapper-level sim with its own commentary beats (PRD 16). The slice order
  lets cups ship with penalties first.
- Giant-killing (a win against a higher tier) produces story and press beats
  through the existing systems.

**UI:** a cup rounds or bracket view (a Leagues screen tab or its own screen;
wireframe first), fixtures in the calendar, a hub snippet, and the competition
in the match header.

**Scope doc updates:** PRD 10 (new F-id for domestic cups; F10.6 stays the
international cup), PRD 11 (cup money), PRD 16 (shootout beats), PRD 23 (cup objectives).

**Slices**
1. Cup state, entrants, draw, quick-sim rounds and archive results (cups run
   in the background, AI only).
2. The player's ties through the match flow, penalty shootout, prize money,
   per-competition discipline.
3. UI (bracket, calendar, hub), story and press beats, national cup
   qualification from the regional cup, and extra time if the engine work is approved.

**Acceptance:** every season both cups finish with exactly one winner; no club
has two fixtures in one week; the regional winner appears in next season's
national cup; the long run passes.

**Open questions (default):** extra time (default: national cup only, after
slice 3); cup names (invented).

**Progress:** —

---

## Phase 6 — In-match management

**Problem.** In a live match the manager can only substitute (PRD 27 slice 1).
PRD 27 lists switching tactics presets at half-time as still open. There are no
shouts or team talks, and the AI never changes its approach either.

**Design**
- Tactics changes reuse the substitution replay in `buildMatchView`
  (`server/src/api/match-view.ts`). A new input
  `tacticChanges: { afterSeq, teamId, patch: Partial<TeamTactics> }[]`. The
  step loop already passes `current.homeTactics` and `current.awayTactics`
  (`shared/src/match-state.ts:40`) to `step` on every tick. Patching them at
  `afterSeq` needs no engine change and keeps determinism: the same decisions
  give the same match.
- Controls at every pause (manual pause, half-time card, injury prompt):
  mentality, pressing, tempo, line height and intensity, plus a preset switch
  (three slots, F1.2). Formation changes come only through a preset at
  half-time at first; slot reassignment has to be checked against
  `server/src/engine/shape.ts` before that.
- Shouts are named patches, either for a short spell or permanent, for example
  "Push forward", "Hold the lead", "Press higher", "Calm down". The phase PRD
  sets the values.
- Half-time team talk: three or four tones. The effect is a small temporary
  morale or form modifier for the second half. Its sign depends on the
  context (score, favourite or underdog) and on player morale. First check how
  the engine reads form and morale mid-match: if it only reads them in
  `createInitialState`, the wrapper patches `state.players`.
- AI reactions: deterministic rules (trailing after 60' → more attacking;
  leading after 75' → protect the lead). This changes AI-vs-AI results, so it
  needs an ADR 0003 calibration run and stays behind a flag until the bands hold.
- Fix: substitutes' minutes count for fitness, growth and appearances. PRD 27
  lists this as open: "Woche zählt weiter nur die Startelf".

**Scope doc updates:** PRD 27 (slice 2), PRD 10 F1.9, PRD 16 (beats for shouts
and talks, if any).

**Slices**
1. `tacticChanges` in the wrapper, the half-time preset switch, and sliders in
   the pause UI.
2. Shouts, team talk, calibrated AI reactions, substitutes' minutes.

**Acceptance:** golden tests unchanged when no changes are requested; the same
changes replay to the same match; calibration bands hold with AI reactions on.

**Progress:** —

---

## Phase 7 — Club history and chronicle

**In:** a club history screen with one row per season (tier, place, points,
cup runs), an honours cabinet (2D SVG trophies, F11.4), club records (biggest
win and defeat, all-time top scorer, most appearances, record transfers in and
out, record attendance), champions per tier and season, and retired legends
(phase 1 records). The player profile gets a career table across seasons and clubs.

**Data:** the season archive (phase 2), cup results (phase 5), retired records
(phase 1) and `transferState.history`. Records that need data the archive does
not keep (attendance) are tracked from this phase on and cannot be rebuilt for
past seasons.

**Scope doc updates:** PRD 10 F11.4 (milestone → now), F11.6 if milestones are included.

**Progress:** —

---

## Phase 8 — Pre-season friendlies

- In pre-season, the winter break and free cup weeks without a fixture,
  friendly offers arrive through Postfach or a calendar action: a weaker local
  club (gate income, confidence) or a stronger club (appearance fee, a tough test).
- Played through the normal match flow or simulated. No table or season-stat
  impact. Minutes count for fitness and youth development (PRD 03.5), and the
  injury risk is lower.
- The engine sub limit stays at 3 (an engine invariant). More substitutes in
  friendlies would be an engine change and is out by default.

**Progress:** —

---

## Phase 9 — Set-piece takers

- Tactics screen: penalty, direct free kick, and left and right corner takers,
  with an auto-suggestion from attributes. A captain already exists
  (`src/narrative/captain.ts`).
- Engine today: free kicks go to the nearest player
  (`server/src/engine/shots.ts:499`); the penalty taker is chosen near
  `shots.ts:585`. The change makes the engine prefer the designated taker when
  he is on the pitch. That is an engine change, so ADR 0003 calibration applies.
  The squad contract gets `setPieceTakers`.
- AI clubs pick takers with the same suggestion function.

**Scope doc updates:** PRD 10 F1.8.

**Progress:** —

---

## Phase 10 — Difficulty

- Chosen when a new career starts and stored in the save manifest. Shown in
  settings but not changeable mid-career (default).
- Levers: starting budget, board patience and targets, AI transfer
  aggressiveness and budgets, financial-crisis thresholds. Never touched:
  engine strength and scouting honesty (PRD 04).
- Three levels; the default is today's balance.

**Scope doc updates:** PRD 10 (new F-id under module 12), PRD 24 (new-career flow).

**Progress:** —

---

## Phase 11 — Player happiness: promises and transfer requests

- Minutes promises exist in contracts (`guaranteed_minutes_promise`,
  `src/transfers/contract-talks.ts`), but nothing checks them. Track rolling
  minutes against the promise. A broken promise leads to a morale drop, then a
  Postfach complaint, then a talk (praise and criticize exist in
  `src/player/profile-actions.ts`), and finally a transfer request
  (`desire_to_leave` exists), after which AI clubs see him as available.
- Ambition: after promotion or relegation, or when a higher-tier club is
  interested (phase 2), good players may want a bigger club.
- Effects run through existing systems; morale already feeds engine form (db156e8).

**Scope doc updates:** PRD 10 F1.7, PRD 05 (transfer requests).

**Progress:** —

---

## Dependencies

```text
1 World longevity ──► 2 Pyramid ──► 7 Chronicle
                         │            ▲
                         └──► 11 Happiness (ambition)
3 Suspensions ──────────┐            │
4 Season calendar ──► 5 Cups ────────┘
                 └──► 8 Friendlies
6 In-match, 9 Set pieces, 10 Difficulty: independent
```

---

## Risks

| Risk | Phase | Mitigation |
|---|---|---|
| Save size and week-sim time with about 2,000 AI players | 2 | Budgets measured; dormant-tier fallback |
| Engine not scale-invariant, so top-flight results drift | 2 | Calibration run with tier rosters before enabling tiers 1–3 |
| Per-week systems inflate with a longer year | 4 | Normalization plus a yearly regression test |
| Calendar refactor touches many systems | 4 | Slice 1 is a behavior-neutral adapter |
| AI tactical reactions shift league balance | 6 | Feature flag plus calibration |
| A longer season means more NEXT presses | 4 | Quiet-week skipping in "simulate until" |
| Pre-release saves break on each bump | all | Accepted (PRD 08.10); migrations still written |
