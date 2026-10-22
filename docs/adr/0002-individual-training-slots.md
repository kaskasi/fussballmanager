# ADR 0002 — Individual training slots

**Status:** Accepted · 2026-10-23

## Context
Only 3 individual programmes could run at once (`MAX_INDIVIDUAL_PROGRAMS`). The number had no source in the game and nothing could raise it.

## Decision
Slots come from `individualTrainingSlots()` (`src/development/individual-training-capacity.ts`):
- 1 base slot
- Trainingszentrum (built and docked): +1 at L1–2, +2 at L3–4, +3 at L5
- Trainingsplatz level ≥ 2: +1
- +1 per hired coach (attack, defense, fitness)
- cap 8 (the maximum you can reach)

If slots drop (a coach leaves, for example), running programmes finish as planned. New ones start only when a slot is free.

## Consequences
- A new career with three coaches starts with 4 slots, more with a Trainingszentrum.
- The Individual tab shows the breakdown and what unlocks the next slot.
- Finished programmes are stored in `individual_history` (last 20) for the Results list.
