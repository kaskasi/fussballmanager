# Match presentation vs engine (Design Law 4)

> **Superseded (2026-10-23):** ADR 0003 reopens the engine for measured calibration, ADR 0004 removes the live pitch. Kept for history only.

**Status:** Active  
**Last updated:** 2026-09-28

`server/src/engine/` is **hands-off** (Design Law 4 / Gesetz 4). Match believability fixes must land in wrappers, presentation, or event-consumption layers unless the architecture is explicitly reopened.

## Item 7 — what ships outside the engine

| Issue | Layer | Approach |
|---|---|---|
| Throw-in banner style | Frontend assets | SVG banner aligned with goal/corner/penalty (`public/match/throw-in-banner.svg`) |
| Wide shots toward corners | `server/src/api/match-presentation.ts` | Rewrites displayed ball Y on `wide`/`woodwork` shot frames toward the near post before `MatchView` is returned |
| GK↔CB defensive ping-pong (long playback) | `src/match/match-presentation.ts` + `useMatchPlayback` | Collapses 3+ consecutive GK↔CB ticks in the defensive third into two playback frames |

Tests: `server/src/api/match-presentation.test.ts`, `src/match/match-presentation.test.ts`.

## Blocked without engine access

| Issue | Why blocked | Honest mitigation today |
|---|---|---|
| GK/CB positioning near the penalty spot | Player shape targets live in `server/src/engine/shape.ts` | None — presentation cannot move dots to a different tactical line without falsifying the sim stream |
| GK↔CB pass selection / fewer recycle events | Pass weights live in `server/src/engine/pass-graph.ts` | Playback compression only (see above); event log and stats unchanged |

**Decision needed:** If Jan wants fewer recycle *events* (not just faster replay), that requires an approved engine change or a post-sim editorial pass with explicit product sign-off.
