# PRD 32 — League pyramid (five tiers), season archive, late-career decline

**Status:** In progress · 2026-10-29 · Phase 2 of PRD 30. Slices 0–1 built.
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
(was − 12) + (reputation − 40) × 0.1 (PRD 31 §5). AI 17–20-year-olds now sit
at about 60 CA in a world whose generated players average about 88. They
reach about 87 at 21–24 and the first team in their mid-twenties.

Decline still matters even though it moves the mean by only about one point.
It is what makes old players worse than players in their prime. At season 20
of the built run, the 32–34 band averages 103 CA against 113 for 29–31; before,
it was 142 against 141.

**Still open (slice 2):** the remaining +12–13 % hump in seasons 6–11. The
generated 18–21-year-olds start at club level (`peakCaBaseAdjustment` is only
−5 at 20 and under) and then grow 30+ CA. An age-shaped generator that keeps
the club mean the same (−15 at ≤20, −8 at 21–22, +2/+6/+7 at 23–31) only
lowered the hump to +12 %. Slice 2 regenerates all tiers anyway. There,
generated youngsters and journeymen (`AI_JOURNEYMAN_STRENGTH_GAP`, ages 22–29)
are calibrated against the steady state, and the full long run must keep
drift under 10 % in every season.

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
  simSalt: number;       // season-end batch sim seed salt
  tableSalt: number;     // Leagues-screen table seed salt (until slice 3)
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

## 5. World generation for tiers 1–3 (slice 2)

- 54 new clubs, generated with a new salt per tier (PRD 12 principle 4: the
  36 existing clubs and their players do not change for a given seed). Cities
  come from the nationwide list (`src/world/real-cities.ts`). Club ids follow
  the existing scheme with a tier-specific stable index.
- Club strength (generator scale, today Oberliga 60–74, Regionalliga 78–83):
  starting targets are tier 3 about 88–94, tier 2 about 97–104, tier 1 about
  106–116, with overlap between neighbors. Reputation rises by tier. These are
  targets for the calibration run, not final values: ADR 0003 calibrates up to
  "Elite ×1.3", and tier 1 must stay inside the bands
  (`npm run calibrate:career` with tier rosters).
- The fixed club layer (`WORLD_CLUB_SEED`, PRD 24) grows from 36 to 90 clubs.
  Rosters vary per career as today.
- Existing worlds: `src/world/upgrade-generated-world.ts` adds the 54 clubs
  and their players. Save migration (PRD 08.10).
- Age shape and journeymen calibrated against the steady state (§2, still open).

## 6. Economy per tier (slice 2, PRD 11)

Starting values, to be checked against the club-economy tests:

| Tier | Sponsorship/wk | TV/wk | Staff/wk | Maintenance/wk | Stadium (cap · fill · ticket) | Prize 1st | TV season bonus 1st |
|---|---|---|---|---|---|---|---|
| 1 | 1,400,000 | 1,600,000 | 220,000 | 110,000 | 50,000 · 0.88 · €38 | 4,000,000 | 6,000,000 |
| 2 | 450,000 | 380,000 | 90,000 | 45,000 | 28,000 · 0.75 · €28 | 1,500,000 | 2,000,000 |
| 3 | 160,000 | 60,000 | 35,000 | 18,000 | 15,000 · 0.70 · €22 | 600,000 | 700,000 |
| 4 | 55,000 | 12,000 | 18,000 | 9,000 | 8,000 · 0.72 · €18 | 180,000 | 250,000 |
| 5 | 28,000 | 4,500 | 11,000 | 6,000 | 4,500 · 0.62 · €12 | 45,000 | 55,000 |

Tiers 4 and 5 keep today's values. AI transfer budgets scale with the tier's
sponsorship and TV (`src/transfers/ai-transfer-market.ts`).

## 7. Live tables (slice 3)

- The player's division stays engine-simulated per matchday
  (`advanceLeagueWeek`). Every other tier plays its matchday each week with the
  quick strength model (`simulateMatchdayResults`, today used only at season
  end), so its table is live. Results are stored per division:
  `league.division_results: Record<DivisionId, FixtureResult[]>`, which
  replaces the season-end batch.
- Player stats stay limited to the player's division.
- Leagues screen: tier switcher (wireframe update first, design.md §9.NN of
  the Leagues screen). Zone colors per boundary (`promotionZoneRank` reads the
  registry).
- Promotion out of Regionalliga Nord is switched on in this slice. Before
  that, tiers 1–3 exist but the 3 ↔ 4 boundary is closed.

## 8. Market, board, jobs, archive (slice 4)

- AI market across tiers: higher-tier clubs buy from lower tiers; budgets per
  tier. The scouting market covers all tiers (measure list build time).
- Board (PRD 23): objectives derive from the club's reputation rank inside its
  tier; promoted clubs default to "stay up".
- Job offers (`src/board/job-offers.ts`) can come from higher tiers after
  success.
- Season archive, appended at season end:
  `{ season, divisions: [{ id, table: [teamId, P, W, D, L, GF, GA, Pts][], champion, promoted, relegated, playoff }], awards, own: { division, place, points, results } }`.
  Ids and numbers only. Phase 5 adds cup results, phase 7 the UI.

## 9. Budgets and long run

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

## 12. Save

Slice 0 changes no schema. Slices 1–4 bump `SAVE_VERSION` once per slice that
changes the schema (pool keys, new clubs, `division_results`, archive).

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
- Next: slice 2 (world generation for tiers 1–3, economies, calibration, save
  migration, steady-state age shape for the CA hump).
