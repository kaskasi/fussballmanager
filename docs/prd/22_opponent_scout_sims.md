# PRD 22 — Gegner-Scouting (Sim-Bündel)

**Status:** v1 shipped (engine wrapper only, no `server/src/engine` edits)

## Purpose

Special scout assignment **scout next opponent**: run multiple **deterministic** match simulations with varied player tactics/formations; deliver an **analytics Postfach** card with 2–3 suggested approaches — not full match playback.

## Scope

| In | Out |
|---|---|
| Postfach card after job completes | 10× live commentary UI |
| Aggregate: result spread, shots-on-target proxy, tactic rows | Cloud LLM narrative |
| Scout trust → band width / row count | Assistant auto-starts (PRD 19) |
| Start: Kalender (Spielwoche); Aufstellung nur Link zum Postfach-Report wenn vorhanden | Scouting-Treffer tab entry |

## Job rules

- **When:** current calendar week is a **league match week** (`prepareCareerMatch` non-null).
- **Cost:** 1 hired scout blocked for **4 working days** (Mo–Fr NEXT ticks; default `working_days_total = 4`).
- **Scout pick:** highest `trust` among scouts not busy on map trips or another opponent job.
- **Sims:** 10 variants at job completion; seed `opponentScoutSimSeed(master_seed, season, week, match_id, variant_i, tactic_hash)`.
- **Squads:** same home/away resolution as career match; **only player `SandboxPlan` varies** per variant (presets + current lineup).
- **Engine:** `buildCareerMatchViewLocally` → `buildMatchView` (PRD 17, Gesetz 4).
- **Performance:** wall-clock **&lt;3 s** for 10× on desktop (`opponent-scout-sims.benchmark.test.ts`).

## Match identity

`match_id = s{season}_w{week}_md{matchday}_{homeTeamId}_{awayTeamId}` from current `CareerMatchSetup`.

## Aggregates & report

Per variant: final score, shots, shots on target (xG proxy), corners, pass completion %, formation label, risk tag (`balanced` | `high_line` | `low_block`).

**Mode scoreline (`modeScoreline`):** the **most frequent** `home:away` score among scout sims (histogram mode). It is **not** a match prediction—label in UI as “Häufigstes Sim-Ergebnis (N Läufe)”.

**Bundle summary (4×3 grid, v2):** twelve aggregates across all sims in the job—mode scoreline, win/draw/loss %, avg goal diff, goals/shots/SoT for & against, pass %, corners. Stored on `OpponentScoutReport.bundleSummary` (no save_version bump).

**Recommendations (2–3 rows):** cluster by formation; each row = formation label, predicted score band (trust widens/narrows), risk icon. Trust &lt; 55: max 2 rows; trust ≥ 55: up to 3.

## Tactic lattice & Monte Carlo (offline / future in-game)

Continuous `SandboxPlan` has infinite permutations. Research uses a **finite lattice**: 3 formations × quantized mentality / pressing / lineHeight steps; duties from formation defaults.

- **Offline study:** `npm run study:opponent-scout` (`vite-node scripts/run-opponent-scout-nordstern-study.ts`) — FC Nordstern vs **weaker / similar / stronger** league opponents (starter Ø CA), 375 lattice plans × 20 seeds; quick: `npm run study:opponent-scout:quick`. Artifacts: `docs/research/opponent-scout-nordstern-strength-sweep.{md,json,csv}`. CI: quick probe in `opponent-scout-lattice.study.test.ts` only.
- **Method:** deterministic `buildMatchView` only (Gesetz 4)—empirical win rates and goal means, not neural nets or cloud LLM.
- **Cards:** not in `MatchSideStats` v1; deferred unless event fold added in wrapper.

## Output (Postfach)

- Title: fixture + opponent name + crest
- **4×3 analytics grid** (icon-first mini statlines)
- 2–3 tactic rows (icon-first)
- CTA: **Taktik** (lineup flow), **Kalender** — no yellow NEXT in card body (design.md §10)

## Persistence

```ts
scout_board.active_opponent_scout?: {
  match_id: string;
  assigned_scout_id: string;
  working_days_done: number;
  working_days_total: number;
  season: number;
  week: number;
} | null;
```

Save ≥ 69 (`migration_069_opponent_scout`).

## References

- PRD 04 scouting calendar / scout scarcity
- PRD 16/17 match presentation vs engine
- PRD 09 Postfach, PRD 14 calendar
