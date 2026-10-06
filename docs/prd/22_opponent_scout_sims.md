# PRD 22 — Gegner-Scouting (Sim-Bündel)

**Status:** Spec v1 (Jan rule-break: engine wrapper, no `server/src/engine` edits)

## Purpose

Special scout assignment **scout next opponent**: run multiple **deterministic** match simulations with varied tactics/formations; deliver an **analytics inbox** card with 2–3 suggested approaches — not full match playback.

## Scope

| In | Out |
|---|---|
| Postfach card after job completes | 10× live commentary UI |
| Aggregate: result spread, implied xG proxy, weak lines | Cloud LLM narrative |
| Scout trust → report quality | Assistant auto-starts (PRD 19) |

## Job rules

- **Cost:** 1 scout slot + **5 working days** (range 4–6 tunable; default 5).
- **Sims:** 10 variants, seeds `hash(master_seed, season, week, match_id, variant_i, tactic_hash)`.
- **Engine:** `buildMatchView` / headless `step` loop via existing API wrapper only (PRD 17, Gesetz 4).
- **128× playback:** irrelevant — sims are headless; wall-clock target **&lt;3 s** for 10× on desktop (see `opponent-scout-sims.benchmark.test.ts`).

## Output (inbox)

- Title: next fixture + opponent crest
- 2–3 rows: formation label, predicted score band, risk tag (icon-first)
- CTA: Taktik / Kalender (no second NEXT in content)

## Persistence (future save slice)

`scout_board.active_opponent_scout?: { match_id, variants_done, working_days_done }` — not required for spec-only v1.

## References

- PRD 04 scouting time scarcity
- PRD 16/17 match presentation vs engine
