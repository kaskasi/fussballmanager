# PRD 32 — League pyramid (five tiers), season archive, late-career decline

**Status:** Built (slices 0–4) · 2026-10-30 · Phase 2 of PRD 30. National scouting open (§11).
**Features:** F10.8 (PRD 10, M4 → now), F10.3. **Touches:** PRD 02 (decline),
PRD 03/31 (AI youth level), PRD 11 (tier economies), PRD 12 (structure),
PRD 19 (Act 3), PRD 23 (objectives), PRD 24 (modes).

"Tier" here means a level of the league pyramid (1 = top flight). PRD 23's
"Club-Standing-Tier" is a different thing and keeps its name.

## 1. Problem

Only Regionalliga Nord and Oberliga Nord exist, so winning the Regionalliga
leads nowhere (`regChampion` in `applyPromotionRelegation` is computed and never
used). The world also inflates: AI mean CA ends 20 seasons about 30 % above
season 1 (PRD 31 §8), because no player ever declines.

## 2. Slice 0 — late-career decline and CA drift (built)

**Owner decision (2026-10-29):** fix the CA drift in phase 2, with real
late-career decline: athletics and pace go first.

**Decline (PRD 02.2, `DECLINE_CURVES` in `src/development/growth-engine.ts`).**
Every week a player loses a share of each attribute's current value. The
share rises with every year past the group's start age:
`min(cap, first + step × (effective_age − start))` percent per year.

| Group | Starts at | First year | +per year | Cap |
|---|---|---|---|---|
| Pace | 27 | 1.5 % | 1 % | 8 % |
| Stamina | 28 | 1.5 % | 1 % | 8 % |
| Technical (shooting, passing, dribbling, technique) | 29 | 1 % | 0.75 % | 5 % |
| Strength | 30 | 1 % | 0.75 % | 5 % |
| Mental (composure, positioning, vision, concentration, teamwork, weak foot) | 31 | 0.5 % | 0.5 % | 3 % |
| Goalkeeping (`gk_handling`) | 32 | 1 % | 0.75 % | 5 % |
| Leadership | never | | | |

A share rather than fixed points keeps the decline proportional in every
tier. Learning also tapers sooner: `ageDevelopmentFactor` is 0.35 at 28–29,
0.15 at 30–31 and 0.05 from 32 (was 0.65 up to 32, then 0.28). It applies to
own and AI players alike.

The result, measured on a cohort of generated AI players aged 24 who always
play (seed 2026): CA peaks at 31, then drops 1–2.5 points a season from 33.
Pace peaks at 30 and loses 1–3.5 points a season after that. Positioning
stays flat until 34.

**Decline alone does not stop the drift.** World-only runs (AI growth and the
real season end, no matches: `scripts/longrun-world-fast.ts`, about 17 s for
20 seasons), seed 2026, drift of AI mean CA against season 1:

| Build | Season 7 | Season 10 | Season 20 |
|---|---|---|---|
| Before (PRD 31) | +23.0 % | +27.4 % | +30.6 % |
| Decline only | +22.0 % | +26.5 % | +30.2 % |
| AI youth gap 30, old curve | +16.6 % | +16.4 % | +11.6 % |
| AI youth gap 30 + decline | +14.6 % | +14.3 % | +10.3 % |
| **AI youth gap 34 + decline (built)** | **+13.2 %** | **+11.8 %** | **+5.9 %** |

The extra CA comes from young players, not old ones. AI youth arrived only 12
points below club strength and grew about 45 CA by their mid-twenties, so a
club's 21–24-year-olds ended up 20 points above its generated players. Slice 0
therefore also lowers AI youth: skill mean = recruiting strength − **34**
(− 38 since slice 2; was − 12) + (reputation − 40) × 0.1 (PRD 31 §5). AI 17–20-year-olds now sit
at about 60 CA in a world whose generated players average about 88. They
reach about 87 at 21–24 and the first team in their mid-twenties.

Decline still matters even though it moves the mean by only about one point.
It is what makes old players worse than players in their prime. At season 20
of the built run, the 32–34 band averages 103 CA against 113 for 29–31; before,
it was 142 against 141.

**The hump (fixed in slice 2).** After slice 0, drift still peaked at +13 % in
seasons 6–11: the generated world started flat by age (`peakCaBaseAdjustment`
only −5 at 20 and under), so its young players grew 30+ CA past the level the
world settles at. The season-1 world now starts near that steady state:
`worldAgeShape` (generated rosters only; journeymen keep the old adjustment)
shifts a player's base by age.

| Age | ≤20 | 21–22 | 23–24 | 25–28 | 29–31 | 32–34 | 35+ |
|---|---|---|---|---|---|---|---|
| Base shift | −22 | −10 | 0 | +10 | +14 | +8 | +2 |

A steep shape makes a club's strength depend on the ages it happened to
draw, which pushed FC Nordstern out of its PRD 12 underdog corridor on some
seeds. Each generated club is therefore shifted so its roster averages the
expected shape; club strength stays independent of the age draw. Nordstern's
base moved from 68.5 to 68.3 to keep the corridor on all 100 test seeds
(median gap 6.1–16.4, second-weakest gap ≤ 5.6). AI youth moved from − 34 to
**− 38**. Journeyman strength barely matters (few are recruited): gap 3, 8 and
12 gave the same curve.

| Build (world-only, 20 seasons) | Seed 2026 peak | Seed 2026 S20 | Seed 7 peak | Seed 99 peak |
|---|---|---|---|---|
| Slice 0 | +13.2 % | +5.9 % | — | — |
| Age shape, no club correction, youth − 38 | +7.7 % | +2.4 % | +6.8 % | +7.6 % |
| **Built** (club correction, Nordstern 68.3) | **+7.6 %** | **+2.1 %** | **+6.8 %** | — |

## 3. Pyramid

| Tier | Id | Name | Clubs | Status |
|---|---|---|---|---|
| 1 | `meisterliga` | Meisterliga | 18 | new |
| 2 | `meisterliga-2` | Meisterliga 2 | 18 | new |
| 3 | `nationalliga` | Nationalliga | 18 | new |
| 4 | `regionalliga-nord` | Regionalliga Nord | 18 | exists (was tier 3 in `DIVISION_ECONOMY`) |
| 5 | `oberliga-nord` | Oberliga Nord | 18 | exists (was tier 4) |

The names are invented and neutral: no DFL/DFB marks (PRD 12 Out). All tiers
play 34 matchdays on one calendar.

**Boundaries** (`boundaryBelow`):

| Boundary | Direct up / down | Playoff |
|---|---|---|
| 1 ↔ 2 | 2 / 2 | 16th of tier 1 vs 3rd of tier 2 |
| 2 ↔ 3 | 2 / 2 | 16th vs 3rd |
| 3 ↔ 4 | 2 / 2 | 16th vs 3rd |
| 4 ↔ 5 | 1 / 1 | 17th vs 2nd (unchanged) |

Each playoff is one match at the upper club's ground, as today's Relegation. A
club takes part in at most one boundary per season. Movements are applied top
to bottom from final tables, so a pool always keeps 18 clubs.

## 4. Registry (`src/sim/league-pyramid.ts`)

```ts
interface PyramidDivision {
  id: DivisionId;
  tier: number;          // 1 = top flight
  clubCount: number;     // 18
  simSalt: number;       // quick-sim seed salt (live matchdays and season-end fallback)
  careerStart: boolean;  // offered in the new-career club pick
  boundaryBelow?: { direct: number; playoff: boolean; playoffSalt: number };
}
```

The playoff always pairs the first place above the upper division's drop zone
(home) with the first place below the lower division's direct promotion
places: 17th vs 2nd with one direct place, 16th vs 3rd with two. Labels stay
in `DIVISION_ECONOMY` (proper names, not translated).

- `PYRAMID` is ordered top to bottom. `DivisionId` is the union of its ids;
  `DivisionEconomyId` stays as an alias. Helpers: `tierOf`, `divisionAbove`,
  `divisionBelow`, `bottomDivisionId`, `careerStartDivisionIds`,
  `divisionOfClub`, `emptyDivisionPools`, `tableZone`.
- The tier number moved from `DIVISION_ECONOMY` to the registry and was
  renumbered (Regionalliga 3 → 4, Oberliga 4 → 5). The three places that
  compared tier numbers (AI budgets, AI "top club" flag, loan cap fallback,
  club-pipeline finances) were shifted with it, so they behave as before.
- Data tables keyed by division id (`DIVISION_ECONOMY`, `CAP_BY_DIVISION`)
  are typed `Record<DivisionId, …>`, so slice 2 cannot forget an entry.
  `server/src/db/squad-map.ts` keeps its own `DIVISION_ID`: the server package
  does not import client code.
- Rollout switches, removed when their slice lands: `boundaryBelow.closed`
  (Nationalliga ↔ Regionalliga; removed in slice 3) and `transferMarket`
  (tiers 1–3 off the AI market; removed in slice 4). Club events
  are written only for boundaries the manager's division touches;
  `PromotionRelegationResult.playoffs` lists every playoff.
- Promotion and relegation club events are i18n strings now
  (`clubEvent.promoted`, `clubEvent.relegated`, `clubEvent.playoff`); the
  arrow and target emoji are gone (PRD 30 cross-cutting rule).
- Pairwise code goes: `REGIONALLIGA_ID`/`OBERLIGA_ID`, the two-key
  `league_pools`, the pool checks in `normalizeLeagueState`, the hard-coded
  pair in `leagueStateAfterMovement` and `applyPromotionRelegation`. All become
  loops over the registry.
- Slice 1 registers only tiers 4 and 5 and must not change behavior: same
  seed, same tables, same movements. A golden test records today's season-end
  movements for one seed before the refactor.

## 5. World generation for tiers 1–3 (slice 2, built)

- **Clubs.** 54 new clubs at world indices 36–89 (Meisterliga 36–53,
  Meisterliga 2 54–71, Nationalliga 72–89), generated after the 36 northern
  clubs with their own salts (`national-club`, `national-cities`). The northern
  clubs and their 792 players are byte-identical with and without the new
  tiers (checked on seeds 2026 and 7). Rivalries stay inside a division.
- **Cities.** `NATIONAL_CITIES_BY_WORLD_REGION` (`src/world/real-cities.ts`):
  54 mid-sized cities in six invented regions (Rheinschiene, Westfalenpforte,
  Mittelgebirge, Elbtal, Oberrhein, Alpenvorland), shuffled per club seed.
  Cities with well-known professional clubs were left out; generated names
  are also checked against `REAL_CLUB_NAMES` (real semi-pro clubs in those
  cities) and re-draw the prefix on a hit. Suffixes: 04, 1909, 1919, Süd, West.
- **Strength** (`startingClubStrength`, generator scale): tier 1 101–112,
  tier 2 92–101, tier 3 84–92. Lowered from the first targets so neighbours
  overlap. Seed 2026, new career, mean CA of pros and best-XI range:

  | Tier | Mean CA | Best XI min / median / max |
  |---|---|---|
  | Meisterliga | 116.4 | 120.5 / 128.3 / 135.3 |
  | Meisterliga 2 | 108.0 | 113.9 / 120.3 / 127.0 |
  | Nationalliga | 100.9 | 107.3 / 112.3 / 116.8 |
  | Regionalliga Nord | 89.6 | 92.1 / 104.1 / 108.3 |
  | Oberliga Nord | 79.0 | 85.1 / 92.2 / 99.2 |

- **Reputation base** per tier (plus 0–20): 75, 62, 50, 40, 24.
- **Names.** National players draw from the northern name pool plus 61 first
  and 69 last names (`NATIONAL_FIRST_NAMES`, `NATIONAL_LAST_NAMES`); with only
  the old 95 × 99 pool, 1,980 players shared names too often. Northern names
  do not change.
- **Backstory.** Generated veterans carry archived growth snapshots
  (`applyVeteranBackstory`, up to 14 seasons, about 3 KB per player). National
  players keep one archived season (`NATIONAL_BACKSTORY_SEASONS`): a new
  career save drops from 1,208 KB to 901 KB gzipped.
- **Background tiers until slices 3–4.** Tiers 1–3 grow, age, retire, recruit
  youth and play a season-end batch with promotion and relegation among
  themselves. Slice 3 made their tables live and opened the Nationalliga ↔
  Regionalliga boundary (§7); slice 4 put their players on the AI transfer
  market (§8). Their regions are not scout zones, so they do not reach the scouting pool. The
  Leagues screen shows all five tabs and builds only the open tab's table.
- **Calibration** (`npm run calibrate:career -- --division=<id>`, 8 matchdays
  × 3 seeds, 216 matches, no engine change): every tier shows the three
  misses the career set already had before this slice (goals 2.0–2.3 against
  2.40–3.60, top-shooter share about 53–55 %, hat-tricks 4–9 %; pre-slice
  Regionalliga: 2.24 / 54.7 % / 10.6 %). No new misses at top-flight strength;
  Meisterliga draw rate 22.7 % (Regionalliga 29 %).
- **Existing saves:** `migration_102_league_pyramid` (SAVE_VERSION 102) adds
  the 54 clubs, their pools and rosters from the save's own seeds, moves the
  new players' birth years, contracts and club history to the save's season,
  and gives any id clash a free id. `normalizeLeagueState` fills a missing
  national pool on its own instead of resetting all pools.

## 6. Economy per tier (slice 2, PRD 11, built)

In `DIVISION_ECONOMY` (places 2–6 step down from first place as in the
existing tiers):

| Tier | Sponsorship/wk | TV/wk | Staff/wk | Maintenance/wk | Stadium (cap · fill · ticket) | Prize 1st | TV season bonus 1st |
|---|---|---|---|---|---|---|---|
| 1 | 1,400,000 | 1,600,000 | 220,000 | 110,000 | 50,000 · 0.88 · €38 | 4,000,000 | 6,000,000 |
| 2 | 450,000 | 380,000 | 90,000 | 45,000 | 28,000 · 0.75 · €28 | 1,500,000 | 2,000,000 |
| 3 | 160,000 | 60,000 | 35,000 | 18,000 | 15,000 · 0.70 · €22 | 600,000 | 700,000 |
| 4 | 55,000 | 12,000 | 18,000 | 9,000 | 8,000 · 0.72 · €18 | 180,000 | 250,000 |
| 5 | 28,000 | 4,500 | 11,000 | 6,000 | 4,500 · 0.62 · €12 | 45,000 | 55,000 |

Tiers 4 and 5 keep today's values. AI transfer budgets per tier: §8.

## 7. Live tables (slice 3, built)

- **Every division plays every league week.** The manager's division stays
  engine-simulated (`advanceLeagueWeek`). Every other division plays the same
  matchday with the quick strength model (`simulateDivisionMatchday` in
  `src/sim/division-matchday.ts`, the model the season-end batch used), seed
  `divisionSeasonSeed = masterSeed ^ season ^ simSalt`. Results go to
  `league.division_results[divisionId]`; `resetLeagueSeason` clears them.
- **Season end** reads those results. The batch (`simulateFullDivisionSeason`,
  same seed) runs only for a division without a full live season (tests, or a
  save that skipped weeks). Rosters change during the season, so live
  results differ from what the old end-of-season batch gave.
- **Player stats** stay limited to the manager's division. The leader lists
  of other divisions are still synthesized from their results.
- **Leagues screen** (wireframe `docs/prd/design/09.07-tabellen.md` updated
  first): five tabs "tier · name", top tier first; every table is live, and
  other divisions say "live · quick results". Place badges come from
  `tableZone(divisionId, …)`, and the legend lists only the zones of the shown
  division (`divisionZones`): no promotion zone in the Meisterliga, no
  relegation zone in the Oberliga. `promotionZoneRank` is gone; the matchday
  side panel uses the same zones.
- **Nationalliga ↔ Regionalliga is open**: Regionalliga places 1–2 go up,
  3rd plays the Nationalliga's 16th, Nationalliga 17–18 go down. The `closed`
  switch and `tableSalt` (Leagues-screen seed for foreign tables) are removed.
- **Acceptance test** `src/sim/pyramid-climb.test.ts`: a club wins every match
  in Oberliga Nord and climbs one tier per season to Meisterliga champion,
  with 18 clubs in every pool and no club lost or duplicated each season.
- **Smoke run**: the manager's club moved into the Nationalliga, 12 weeks
  through the real pipeline. It plays 10 matchdays, all four other tables
  stay live, the Nationalliga economy applies, and a week takes 1.48 s.

## 8. Market, board, jobs, archive (slice 4, built)

- **AI market across tiers** (`advanceAiTransferWeek`). Two passes per
  transfer week: the manager's division as before (4 deals in summer, 3 in
  winter), then a background pass for every other AI club (3 / 2). A club
  buys only from its own tier or below; nobody drops a league to join a
  smaller club. Club events are written only for deals that touch the
  manager's division; every deal goes into the transfer history. Season
  budgets per tier, × the Regionalliga budget (€2.2 M): 15 / 6 / 2.5 / 1 /
  0.6, reset for all 89 AI clubs at season end at their next season's level
  (`resetPyramidAiBudgets`). The `transferMarket` switch is gone.
- **Board** (PRD 23). A club that went up starts the new season at
  `survival_mid` ("stay up"); one that went down at `ambition` ("straight back
  up"); a club that stayed keeps the place-based tier
  (`standingTierAfterMovement`). A club outside the manager's table (a job
  offer from another division) is ranked by reputation inside its own
  division (`reputationRankInDivision`) instead of defaulting to 10th place.
- **Job offers** (`listJobOffers`). After a strong season so far (top four
  with at least 10 matchdays played, or a finished season) two of the three
  offers come from the weakest clubs of the division above; otherwise all
  three stay in the manager's division. Story Mode's explicit division
  requests are unchanged.
- **Season archive** (`src/sim/season-archive.ts`,
  `pipeline.season_archive`, appended in `runSeasonEnd`):
  `{ season, divisions: [{ id, table: [teamId, P, W, D, L, GF, GA, Pts][], champion, promoted, relegated, playoff }], awards: [kind, playerId, clubId, value][], own: { division, place, points, results: [home, away, hg, ag][] } }`.
  Under 12 KB raw per season. Phase 5 adds cup results, phase 7 the UI.
- **Not built: national scouting.** Scouting runs on map zones with northern
  geometry (`SCOUT_MAP_ZONES`, region scouts, city maps); tiers 1–3 sit in
  six new regions that are not zones. Players there can be bought by AI clubs
  but the manager cannot scout them yet (§11).

## 9. Budgets and long run

Measured after slice 2 (all five tiers, Progress below): week sim +5 % over
slice 0, save within 2× at seasons 1 and 6. Dormant tiers not needed so far.

- Week sim at most +30 % and gzipped save at most 2× the 2026-10-29 baseline
  (PRD 30): week sim 2.1 s, save 623 KB at season 1. About 1,200 more AI
  players get weekly growth. If the week-sim budget breaks, use dormant
  tiers: tiers two or more away from the player's grow once per season in a
  batch.
- `scripts/longrun-world.ts` runs every slice for at least 10 seasons;
  slice 4 runs 20.

## 10. Acceptance

- A club can climb from Oberliga Nord to Meisterliga champion inside one save
  (scripted test that forces results).
- Every tier has 18 clubs every season; the 20-season long run passes,
  including AI mean CA drift under 10 % in every season (moved here from PRD 31).
- Tier strength order holds after 20 seasons (mean CA 1 > 2 > 3 > 4 > 5).
- Budgets met, or the dormant-tier fallback is active and documented.
- Same seed and same decisions give the same tables and movements.

## 11. Open questions

| Question | Default if unanswered |
|---|---|
| Tier names | Meisterliga, Meisterliga 2, Nationalliga (§3) |
| Stadium licensing (minimum capacity for promotion)? | No hard block in v1: a board warning plus a capacity cap on attendance |
| Clubs from all over the country relegated into "Regionalliga Nord" | Accepted as fiction |
| Decline for own players too? | Yes, one curve for everyone (PRD 02 is shared) |
| National scouting (tiers 1–3 in the scouting pool)? | Not in this phase: needs scout zones and map geometry for six new regions. Follow-up before or with phase 11 (ambition moves to bigger clubs) |

## 12. Save

Slices 0–1 change no schema. Slice 2: `SAVE_VERSION` 102,
`migration_102_league_pyramid` (§5). Slice 3: `SAVE_VERSION` 103,
`migration_103_live_division_tables` backfills the matchdays already played
in every other division (quick model, live seed), so a save from mid-season
keeps full tables. Slice 4: `SAVE_VERSION` 104,
`migration_104_season_archive` starts an empty archive (past seasons cannot
be rebuilt).

## Progress

- Slice 0 (late-career decline, AI youth level, world-only long run): done.
  Full long run (`scripts/longrun-world.ts`, seed 2026, 20 seasons): AI mean CA
  85.3 at season 1, peak 96.6 (+13.2 %) at seasons 7–8, 90.4 (+6.0 %) at
  season 20 (PRD 31 build: +31 %). Drift fails the 10 % line in seasons 5–12
  (the hump, slice 2). Mean age 25.1–26.0; 35+ share 0.4–3.1 % (3.1 % in
  season 19 fails the 3 % line by 0.1 point; PRD 31 build peaked at 2.9 %);
  every roster ≥ 22 with ≥ 2 GK; week sim 1.6–1.9 s; save 1,820 KB gz at
  season 20 (Postfach queue, as in PRD 31). Slice 2 rechecks the 35+ share
  with the hump fix.
- Slice 1 (registry, generic promotion and relegation, no hard-coded ids):
  done. `promotion-relegation.golden.test.ts` was recorded on the two-tier
  code (three seeds, player in either division) and passes unchanged on the
  registry loop.
- Slice 2 (age shape, tiers 1–3, economies, calibration, migration 102):
  done. World-only run with all five tiers (seed 2026, 20 seasons): AI mean
  CA drift peaks at +6.3 %, tier order 122 > 114 > 107 > 91 > 82 at season 20.
  Full long run (`scripts/longrun-world.ts`, seed 2026, 10 seasons, all
  invariants hold): AI mean CA 99.4 → peak 105.8 (+6.4 %, season 7) → 103.1;
  tier order holds every season (season 10: 121.8 > 111.8 > 104.3 > 94.3 >
  82.3); mean age 25.3–26.0; 35+ share 0.8–2.7 %; rosters ≥ 22 with ≥ 2 GK.
  Week sim 1.67–1.89 s (slice 0 run 1.6–1.9 s; budget 2.73 s). Save 1,169 KB
  gz at season 1 (budget 1,246 KB), 1,234 KB at season 6 (budget 1,584 KB),
  1,417 KB at season 10; rival players 939 KB, autopilot Postfach queue
  304 KB. The dormant-tier fallback is not needed.
- Slice 3 (live tables for every division, Nationalliga ↔ Regionalliga
  open, zones per division, migration 103, climb acceptance test): done.
  Long run (seed 2026, 10 seasons, all invariants hold): drift peak +6.5 %
  (season 7); tier order holds every season (season 10: 121.4 > 112.8 >
  103.6 > 94.0 > 82.8); 35+ share 0.8–2.7 %; week sim 1.65–1.87 s (slice 2:
  1.67–1.89 s, so the weekly matchdays of four divisions cost nothing
  measurable); save 1,169 KB gz at season 1, 1,382 KB at season 10.
- Slice 4 (AI market across tiers, board and job offers by tier, season
  archive, tier-order invariant in the long run): done.
  **Acceptance run** (`scripts/longrun-world.ts`, seed 2026, 20 seasons, all
  invariants hold, tier order now one of them): AI mean CA 99.4 at season 1,
  peak 106.0 (+6.6 %, season 7), 103.9 (+4.5 %) at season 20; tier order every
  season (season 20: 121.6 > 115.4 > 105.9 > 96.9 > 80.8); mean age
  25.1–26.0; 35+ share 0.8–2.7 %; rosters ≥ 22 with ≥ 2 GK; no retired-id
  leaks. Week sim 1.61–1.87 s (budget 2.73 s). Save 1,171 KB gz at season 1,
  1,247 KB at season 6 (budget 1,584 KB), 2,463 KB at season 20, of which
  1,135 KB is the autopilot Postfach queue (as in PRD 31) and 23 KB the season
  archive. The dormant-tier fallback was never needed.
- Phase acceptance (§10): climb test, 18 clubs per tier, drift < 10 % every
  season, tier order after 20 seasons, budgets, determinism (fixed seeds
  throughout): met. Open: national scouting (§11).
