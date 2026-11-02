# PRD 31 — World longevity: retirement, AI youth, roster upkeep

**Status:** Done (slices 1–3, PR #34) · 2026-10-29 · Phase 1 of PRD 30. CA drift moved to PRD 32 (§11).
**Feature:** F11.3 (PRD 10). **Touches:** PRD 03 (§03.1.1 AI youth), PRD 07 (id rule, `peak_ca`, `season_lines`).

## 1. Problem

Players age but never retire, and AI clubs get no youth. A headless run of the
unchanged build (seed 2026, `scripts/longrun-world.ts`) after six seasons:
AI mean age 26.5 → 31.5, players aged 35+ 7.7 % → 27 %, and AI mean CA
+22 % (nobody leaves, and growth stays positive at every age, §8).

## 2. Retirement roll (`src/development/retirement.ts`)

Rolled once per player at season end, on the age the player would play
**next** season at (a 34-year-old rolls on the 35 row).

| Next-season age | 31 | 32 | 33 | 34 | 35 | 36 | 37–39 | 40 |
|---|---|---|---|---|---|---|---|---|
| Outfield base chance | 2 % | 5 % | 12 % | 35 % | 60 % | 80 % | 90 % | 100 % |

Keepers use the same row two years later (a keeper at 35 rolls like an
outfield player at 33). 40 is a hard stop for everyone.

Modifiers multiply the base chance (capped at 97 % below the hard stop):

| Condition | Factor |
|---|---|
| CA below 80 % / 90 % of peak (`state.peak_ca`, growth snapshots) | ×2 / ×1.5 |
| Under 5 appearances this season / 25 or more | ×1.5 / ×0.85 |
| Two or more severe injuries logged | ×1.3 |
| Contract ends this season (or none) / runs two or more seasons | ×1.4 / ×0.75 |

The roll is `hash(master_seed, "retire", season, player_id)`: same seed and
same decisions give the same retirements.

## 3. Season-end order (`runSeasonEnd`)

1. Every player, own and AI: append the season line and refresh `peak_ca`
   while club and season counters are still the ending season's.
2. Own squad: growth snapshot, aging, loan returns, pre-contracts (unchanged).
3. **AI retirement**: rolled players leave `rivalPlayers` and become
   `retired.json` records. Their transfer entries (shortlist, offers,
   negotiations, listings) are dropped. A player with an agreed move
   (pre-contract, pending purchase, scheduled transfer) does not roll that
   season: the deal goes through first.
4. Own academy intake (ids now from the free-id allocator, §7).
5. Promotion and relegation (unchanged).
6. **AI roster upkeep** for the division each club plays in next season (§5).
7. AI aging; AI season counters reset (they never reset before).

Own players retire only through the spring announcement (§9).

## 4. Records

- `state.peak_ca` — best CA so far, refreshed at season end.
- `history.season_lines` — `[season, club_id, division_id, apps, goals]` per
  finished season. PRD 30 asked for a tier number; the division id is stored
  instead, because PRD 30 phase 2 renumbers the tiers. The tier comes from the
  division registry.
- `retired.json` — `{ id, name, birth, position, age, retired_season,
  last_club_id, peak_ca, career: season_lines }`. Phase 7 (chronicle) reads it.

## 5. AI roster upkeep (`src/sim/ai-roster-upkeep.ts`)

Per AI club, after retirement:

- **Youth:** 2–4 players (seeded), but only while the roster has room below
  **23**. (24 let every club take two or three youths at the first season end;
  that cohort turned 35 together 18 seasons later.) Built with the academy mixture (PRD 03.1), skill mean = recruiting
  strength − 38 + (reputation − 40) × 0.1 (PRD 32 §2; − 12 until then). Age 17–18 after the season change,
  pro status, three-year contract (`fairInitialProContract`).
- **Refill:** journeymen until the roster has **22** players and the
  positional minimums **2 GK, 6 DEF, 6 MID, 4 ATT**. Positions go to the
  group furthest below its minimum, then furthest below the generated shape
  (2/8/7/5). Journeymen are 23–30 after the season change, at recruiting
  strength − 3 (`generateJourneyman`, same builder as the world generator).
- **Recruiting strength** is fixed per club: the strength its roster was
  generated at (`startingClubStrength`), moved by the gap between division
  anchors (mean generated strength per division) when the club changed
  division. It does not follow the roster: roster-relative recruiting
  compounded the growth inflation (§8) and AI mean CA doubled in 20 seasons.

## 6. AI minutes from selection

`rivalMatchMinutes` ranks each AI roster the way `buildCareerEngineSquad` does
(shared `rankCareerSelection`, 4-4-2 slot fit). On a league matchday the XI
plays 90, the three weakest outfield starters 68, and the best three outfield
bench players come on for 22. Everyone else gets 0; injured players sit out.
Non-match weeks stay at 12 minutes for everyone. This replaces
`rivalMinutesFromId`, which read the shirt from the id suffix and gave every
generated `pl_` player bench minutes. `indexRivalRoster` now reads a shirt
only from legacy `rp_<team>_<shirt>` ids.

## 7. Player ids

- New AI players use `pl_s<season>c<clubIndex>n<slot>`. They never collide
  with five-digit ids. PRD 07 and `validatePlayer` accept both forms.
- Own academy intake used "highest own id + 1". That collided with generated
  AI ids (a duplicate living id by season 14 of the long run) and would run
  past `pl_99999` and throw. Intake ids now come from `allocateFreePlayerIds`:
  the next free five-digit id, skipping every id in play or retired, wrapping
  at 99,999. Ids are never reused.
- The default-seed demo academy shared `pl_00001` with a generated AI player.
  `newGameSession` now moves clashing academy ids to free ones.

## 8. Finding: growth never turns negative

Measured over one season of AI growth (seed 2026), mean CA gain by age:
+9 at 18, +5 at 26, +2.7 at 30, +1 at 35. `decayPerWeek` (PRD 02) is
smaller than the training gain at every age, so no player ever declines.
A player who joins at 17 ends about 85 CA higher at 34; the generated world
spreads ages over only about ±5 CA.

With retirement, youth and anchored recruiting, AI mean CA still rises from
87.6 (season 1) to a plateau of about 113 by season 10 (+29 %) and stays
there; tier order holds. The PRD 30 acceptance line "drift under 10 %" cannot
be met without changing the growth curve, which is PRD 02 and affects own
players too. **Owner decision (§11):** fixed in PRD 32 (phase 2).

## 9. Own players

- **Announcement:** on entering league week 28 (`RETIREMENT_ANNOUNCE_WEEK`),
  own pros (and loaned-out pros) roll with the §2 curve. A "retires" result
  sets `state.retirement = { season, status: "announced" }` and queues a
  Postfach decision (`retirement_announce`, priority 0).
- **Answer:** "Accept the decision" → `retiring`. "Persuade (one-year deal)"
  rolls once (`hash(master_seed, "persuade", season, player_id)`):
  chance = 30 % + (morale − 50) %, +20 points with at least half the
  matchdays played, −10 under a fifth, −15 at 37+ next season, clamped to
  5–85 %, and 0 at the hard-stop age. Success → `staying`, and a contract that
  ends this season runs one more. Failure → `retiring`; it is final.
- **Unanswered** announcements count as retiring. "Simulate until" leaves the
  item open, like departure risks.
- **Season end:** announced players leave before aging and the intake; mentor
  links to them clear; the wage bill drops with them; a `retired.json` record
  and a club event ("Retirement: name (age)") are written. A league-wide
  count event follows. A player sold after announcing keeps to it.
- **Profile:** a "Retires at season end" callout in the identity rail and a
  career table (season, club, league, apps, goals, total) under season stats.

## 10. Long run and budgets

`npx vite-node scripts/longrun-world.ts [--seasons=20] [--seed=2026] [--out=…]`
plays the real week pipeline on autopilot (dismissals are reset) and checks
after every season end: AI mean age 24–28, 35+ under 3 %, every AI roster at
least 18 players and 2 GK, AI mean CA drift under 10 % from season 1, no
retired id in a roster, the market or the shortlist. Exit code 1 on failure.
Not part of vitest (a season takes about 75 s).

**Measured (seed 2026, this container, 2026-10-29):**

| | Unchanged build | PRD 31 build |
|---|---|---|
| Seasons run | 6 | 20 |
| AI mean age | 26.5 → 31.5 | 25.1–26.0 every season |
| AI 35+ share | 7.7 % → 27 % | 0.4–2.9 % |
| Smallest AI roster / fewest keepers | 21 / 2 | 22 / 2 |
| Retired ids still in play | — | 0 |
| AI mean CA | 89.9 → 109.7 (+22 % in 6) | 88.2 → plateau about 113–116 from season 10 (+31 % at the end) |
| Tier order (Regionalliga > Oberliga) | holds | holds (119.6 > 111.7 at season 20) |
| Week sim (mean) | 2.1 s | 2.2 s (+5 %, budget +30 %) |
| Save, gzipped | 623 KB (S1), 792 KB (S6) | 590 KB (S1), 655 KB (S6), 1,780 KB (S20) |

Save at season 20 by part: `pipeline.youth_inbox` 1,137 KB, rival players
335 KB, own players 239 KB, `retired.json` 55 KB. The inbox is an autopilot
artifact this phase did not cause: nobody answers the Postfach, so its queue
grows every week (a real save that ignores the Postfach would grow too; worth a
cap, outside this phase). Retirement data (records plus season lines) is under
70 KB after 20 seasons. Measured per season the PRD 31 build stays below the
unchanged build.

A world-only loop (growth and season end, no matches; about 18 s for 20
seasons) gave the same age and roster results on seeds 7, 99 and 4242; the
35+ share peaks at 2.6–3.2 % there. Keepers aged 35–37 (they retire two years
later by design) set a floor of about 1.5 %.

## 11. Open questions

| Question | Default if unanswered |
|---|---|
| How to stop the CA plateau (+30 %)? Measured options: (a) AI-only growth ×0.4 → drift under 5 % over 20 seasons (×0.6 → +12 %), but own players keep full growth and pull away; (b) late-career decline for everyone (age factor 0.45 at 28–30, 0.2 from 31, stronger decay) → plateau 112, almost no effect, because the gain comes from ages 18–27; (c) leave it and recalibrate with PRD 30 phase 2, which resets tier strengths and runs `calibrate:career` anyway | **Decided 2026-10-29:** in phase 2, with real late-career decline (athletics and pace first). Built in PRD 32 §2 together with a lower AI youth level, which is where most of the drift came from |
| Free-agent pool for released or expired players? | No; refill uses generated players |
| Retired legends as staff (F11.5)? | No; the record is kept |

## 12. Save

`SAVE_VERSION` 101, `migration_101_retirement`: normalizes `retired.json` and
sets `peak_ca` on every player. `season_lines` start empty; `state.retirement`
is optional and needs no backfill.

## Progress

- Slice 1 (roll, AI execution, `retired` persistence, long-run script): done.
- Slice 2 (AI youth, roster upkeep, selection-based AI minutes): done.
- Slice 3 (own-player announcement, persuade flow, Postfach, badge, career table): done.
