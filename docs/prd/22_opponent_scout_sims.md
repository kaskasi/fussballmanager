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
| Start: Kalender (Spielwoche) + Pre-Match Aufstellung | Scouting-Treffer tab entry |

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

Per variant: final score, shots, shots on target (xG proxy), formation label, risk tag (`balanced` | `high_line` | `low_block`).

Bundle: score histogram, mode scoreline, goal bands.

**Recommendations (2–3 rows):** cluster by formation; each row = formation label, predicted score band (trust widens/narrows), risk icon. Trust &lt; 55: max 2 rows; trust ≥ 55: up to 3.

## Output (Postfach)

- Title: fixture + opponent name + crest
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
