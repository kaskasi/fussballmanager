# /docs/prd/24_game_modes.md

**Version:** 1.0  
**Last Updated:** 2026-10-11  
**Status:** Draft (product law for three modes on one sim)

---

## Purpose

One simulation, three **product modes**. Only **Regionalliga Manager** is the active shipping target in code; **Story Mode** and **New Game+** are specified here for later UI/switcher work.

**Dependencies:** PRD 01, 12 (world), 13 (story slice), 19 (career acts / curtain), 20 (presentation), 21 (Act 4 / elite world)

**Code facades:** [`game-mode.ts`](../../src/narrative/game-mode.ts), [`career-presentation.ts`](../../src/narrative/career-presentation.ts), [`story-state.ts`](../../src/narrative/story-state.ts)

---

## Modes

| Mode | ID | Career arc (PRD 19 acts) | Feature curtain | World | Story beats (PRD 13) |
|------|-----|--------------------------|-----------------|-------|----------------------|
| **Story Mode** | `story_mode` | Acts 1–3 (Nordstern → regional → empire) | Progressive per PRD 19 | Regionalliga Nord stack | Full authored arc |
| **Regionalliga Manager** | `regionalliga_manager` | **None** — sandbox career | **Full** from day 1 | Same as today (Regionalliga / Oberliga pool) | **Yes** — relegation slice, cast, Postfach, chronicle |
| **New Game+** | `new_game_plus` | None | Full | Top-tier leagues (Bundesliga, La Liga, Premier, …) per PRD 21 | Optional light framing later |

### Regionalliga Manager (current build)

- Default for **new saves** (`story_state.game_mode = regionalliga_manager`, `career_phase = full`).
- **Presentation:** `manager_desk` (PRD 20) — dense club UI, not storybook spacing.
- **Not** a “no narrative” mode: opening, survival board, fan feed, and PRD 13 beats remain; only the **act-based feature curtain** and **forced act progression** are off.
- Story Mode and NG+ reuse the same sim and save shape; differentiation is `game_mode` + world seed/template + presentation/curtain rules.

### Story Mode (PRD only for now)

- Same Regionalliga world as v1 story slice; `career_phase` drives curtain and `storybook` presentation in acts 1–2.
- Built **on top of** Regionalliga Manager once the shell and full feature set are stable.

### New Game+ (PRD only for now)

- Regionalliga Manager rules + **elite world** generator (PRD 21). No separate codebase.

---

## Switcher (deferred)

- No main-menu mode picker in v1 of this PRD.
- Persist `game_mode` on `story_state` so saves are forward-compatible.
- Future: slot metadata or new-game wizard sets mode before `initializeStoryForNewGame`.

---

## Invariants

- **Sim unchanged** across modes — only presentation, curtain, and world template differ.
- **No invented scores** (PRD 01 / 19 boundary) in any mode.
- Mode must not duplicate nav or NEXT logic; use `resolveFeatureCurtain` / `resolvePresentationMode` only.
