# /docs/prd/24_game_modes.md

**Version:** 1.1  
**Last Updated:** 2026-10-23  
**Status:** Draft (product law for three modes on one sim) · Story Mode Acts 1–2 shipped

---

## Purpose

One simulation, three **product modes**. **Regionalliga Manager** stays the default; **Story Mode** is playable from Act 1 through the Act 2 promotion (Act 3 content pending); **New Game+** is specified here only.

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
- **Random careers (2026-10-23):** every UI career gets its own roster seed (`newCareerSession`). The 36 clubs (names, ids, divisions) stay fixed (`WORLD_CLUB_SEED`); squads, talents, youth and the story cast vary. Story Mode uses the same random rosters with Kieler FC as the Act 1 club.
- **Club pick:** after choosing the mode, Regionalliga Manager offers all 36 clubs ranked by squad strength (`career-club-pick.ts`). The story frame follows the tier: bottom Regionalliga clubs get the relegation battle and survival goal, stronger ones `club_ambition` with tier goals, Oberliga clubs `promotion_push`.

### Story Mode (Acts 1–2 shipped 2026-10-23)

- Same Regionalliga world as v1 story slice; `career_phase` drives curtain and `storybook` presentation in acts 1–2.
- Built **on top of** Regionalliga Manager: same sim, same save shape. Rules live in `career-acts.ts`, `career-act2.ts`, `career-transition.ts`; decisions in [ADR 0005](../adr/0005-story-mode-acts-curtain.md).
- Act 1 (Nordstern, heavy curtain, assistant training, no dismissal) always ends at season 1 end; the outcome comes from the sim's promotion/relegation movements.
- Act 2: the player picks one of 3 Oberliga offers (procedural employer), 1–2 bonded players follow; five scheduled inbox beats unlock the remaining screens; promotion to the Regionalliga opens Act 3.

### New Game+ (PRD only for now)

- Regionalliga Manager rules + **elite world** generator (PRD 21). No separate codebase.

---

## Switcher

- Mode card (`NewCareerModeCard`) after the opening's language step, before name/origin — one gate for first launch, slot card and menu "New game" (`modePickPending`, flag `STORY_MODE_PICKER_ENABLED`).
- `story_state.game_mode_confirmed === false` marks a fresh save waiting for the card; saves without the field count as confirmed.
- `game_mode` is persisted on `story_state`; NG+ still has no picker entry.

---

## Compatibility (pre-release)

Stale saves (older `save_version`, missing `game_mode`, act1 `career_phase` without `story_mode`) are **not** migrated. Load/import/cloud-pull rejects them per **PRD 08.10**. New games set `game_mode` explicitly; Story Mode later only on **new** saves at creation time.

### Load-time `normalizeStoryState` (current-version saves only)

When a save **does** load (`save_version === SAVE_VERSION`), [`normalizeStoryState`](../../src/narrative/story-state.ts) runs as part of session hydration:

| Input | Behavior |
|--------|----------|
| Missing `game_mode` | Resolved via [`resolveProductGameMode`](../../src/narrative/game-mode.ts) → defaults to **`regionalliga_manager`**. |
| `regionalliga_manager` or `new_game_plus` | **`career_phase` forced to `full`** and curtain from [`featureCurtainForPhase`](../../src/narrative/career-presentation.ts) — act1/storybook curtain is **not** preserved on these modes. |
| `story_mode` | Keeps stored `career_phase`, `curtain_unlocks`, `act_transition`, `act_started`, `legend_players`; curtain derived from mode + phase + unlocks (ADR 0005). |

Pre-release: ambiguous legacy act1 slots are rejected (08.10), not silently upgraded. When Story Mode ships, new saves must set `game_mode: story_mode` at creation; do not rely on act1 `career_phase` alone.

## Invariants

- **Sim unchanged** across modes — only presentation, curtain, and world template differ.
- **No invented scores** (PRD 01 / 19 boundary) in any mode.
- Mode must not duplicate nav or NEXT logic; use `resolveFeatureCurtain` / `resolvePresentationMode` only.
