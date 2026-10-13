# /docs/prd/25_contextual_tutorial.md

**Version:** 1.2  
**Last Updated:** 2026-10-13  
**Status:** Final (Phase 1 shipped; Phases 2–4 specified)

---

## Purpose

Per-screen **coach marks** (FM-style tutorial layers): first-visit guidance, story-flavored copy from onboarding, disable globally or per save. Manager Desk hub after opening; mission checklist in the overlay.

**Dependencies:** PRD 09 (screens), 14 (cockpit / NEXT nexus), 19 (onboarding beat), design.md §10 (single yellow NEXT), `docs/prd/playtest_protocol.md` (friction priorities).

**Feature ID:** F12.10 in PRD 10.

**Prioritization rule:** Order phases and steps by **first-week loop** and **playtest friction** (NEXT, inbox, youth, scouting, match)—not shell menu order.

---

## Scope

**In:**

- Persisted `story_state.tutorial` (completed steps, dismissed screens, per-save disable).
- Client pref `coachMarksEnabled` (default on).
- Overlay: scrim + spotlight on `data-coach-target` controls; panel with Lucide icons; **mission checklist** (`TUTORIAL_MISSIONS`) only until Phase 1 desk track complete (`hub.top_development`).
- Phase 1: hub desk + training onboarding through growth widgets (shipped).
- Phases 2–4: per-screen catalog below (implemented in `src/tutorial/tutorial-steps-phases-2-4.ts`).
- Settings toggle; Help reset for tips on current save.

**Out (all phases):**

- Blocking week sim or match flow.
- Analytics events.
- Engine or sim changes.
- Second yellow CTA in content.
- **Training screen tips in Phases 2–4** (Phase 1 training/preset steps are frozen; Help may document presets long-term).

---

## Invariants

| Rule | Detail |
|------|--------|
| No block | Skipping / Esc / “Later” must never prevent week sim or match flow |
| Header NEXT | Tutorials **point at** header NEXT; no duplicate progress CTA in panels |
| Story | Copy may use `career_origin`, cast labels, captain name — no stat grants |
| Match flow | When `matchFlowActive`, hub tutorial steps do not run |
| Curtain | Phase 4 steps use `when(session)` vs `feature_curtain`; never tease locked nav |

---

## Persisted state

```typescript
interface TutorialState {
  version: 1;
  disabled: boolean;
  completed_step_ids: string[];
  dismissed_screens: string[]; // hub, training, …
}
```

Default on new game: empty completed, not disabled.

---

## Phase map

| Phase | Name | Goal | When steps may run |
|-------|------|------|-------------------|
| **1** | Desk onboarding | Origin, NEXT nexus, training/presets, board, time, growth widgets | `opening_complete`; shipped in `src/tutorial/` |
| **2** | Survive first weeks | Inbox, Treter, match flow, duty blockers, hub scout | Phase 1 substantially complete **or** `opening_complete` + `week ≥ 2` |
| **3** | Find and grow talent | Scouting map/pool, opponent report, squad profile, campus auto-youth | `feature_curtain.scouting_nav` (or first map trip) for scouting; campus after first youth report |
| **4** | Run the club | Finances, stadium, merch, transfers, medical, leagues, settings, calendar, help | Nav visible per PRD 19 curtain; first visit per screen |

Phases 2–4 do **not** add steps on the **`training`** screen. Phase 1 training steps remain the only training coach marks.

---

## Phase 1 — Onboarding steps (shipped)

| Step ID | Screen | Mode | Complete when |
|---------|--------|------|----------------|
| `hub.intro_origin` | hub | panel | Continue |
| `hub.click_next` | hub | spotlight `header-next` | User clicks header NEXT |
| `hub.open_training` | hub | spotlight `hub-training-calendar` | Open training |
| `training.set_plan` | training | spotlight `training-pick-slot` | Tap first empty slot |
| `training.use_next` | training | spotlight `header-next` | Run a unit via header NEXT |
| `training.load_preset` | training | spotlight `training-plan-presets` | Load preset (starter in slot 1) |
| `training.save_preset` | training | spotlight `training-plan-presets` | Save current plan to a slot |
| `hub.answer_board` | hub | spotlight `hub-postfach` | Resolve `story_board` inbox item |
| `hub.progress_time` | hub | spotlight `header-next` | Continue after board step |
| `hub.heatmaps` | hub | spotlight `hub-heatmaps` | Continue |
| `hub.top_development` | hub | spotlight `hub-top-development` | Tap period pill or Continue |

Gate: `opening_complete`, client pref on, not per-save disabled, screen not dismissed.

Preset 1 on new careers: balanced week in **template only** (PRD 09 training presets); current week stays empty until load.

Opponent prep: hub duty column (`hub-opponent-scout`), not calendar (PRD 09 desk mode). Der Treter delivery: **Thursday** (`KICKER_DELIVERY_WEEKDAY`).

---

## Phase 2 — Survive the first three weeks (catalog)

**Goal:** Reduce NEXT-loop blockers and inbox confusion before deep systems.

| Prio | Step ID | Screen | Trigger / when | Coach target (TBD) | Complete when | Tester pain |
|------|---------|--------|----------------|-------------------|---------------|-------------|
| P0 | `hub.scout_match_week` | hub | Match week; scout panel visible | `hub-opponent-scout` | Start scout or view report / Continue | Opponent prep moved off calendar |
| P0 | `postfach.inbox_queue` | hub or postfach | Pending inbox items | `hub-postfach` or queue head | Open postfach / focus first item | “1 decision open”; mixed item types |
| P0 | `postfach.resolve_decision` | postfach | Active decision card | inbox action buttons | Resolve one youth/board/scout job item | Playtest: touch youth if prompted |
| P0 | `postfach.treter_thursday` | postfach | Treter item present; weekday ≥ Thu delivery | Treter card | Dismiss or read | Weekly paper timing vs NEXT |
| P1 | `matchday.lineup_next` | matchday | Career match flow active | header NEXT / lineup CTA | Enter lineup or confirm flow | Hub browsing vs match UI |
| P1 | `matchday.skip_menu` | matchday | Live or browsable match | ⋮ skip (design.md §9.15) | Open skip; optional confirm | Skip without losing event stream |
| P1 | `hub.duty_blockers` | hub | `listHubBlockers` non-empty | duty list | Continue after reading | Why NEXT warns (no second yellow CTA) |

**Not in Phase 2:** `training` screen, calendar opponent panel, deep scouting map.

---

## Phase 3 — Find and grow talent (catalog)

**Goal:** Scouting knowledge + squad/profile after the weekly loop feels safe.

| Prio | Step ID | Screen | Trigger / when | Coach target (TBD) | Complete when | Tester pain |
|------|---------|--------|----------------|-------------------|---------------|-------------|
| P0 | `scouting.map_trip` | scouting | First visit with map nav | region map / enqueue | Queue or start trip | Map scouting discovery (F4) |
| P0 | `scouting.pool_confidence` | scouting | Pool non-empty or first open | pool grid + confidence | Continue / open one hit | known / unclear / unknown bands |
| P1 | `scouting.opponent_report` | scouting or postfach | Opponent report in inbox | report card / apply plan | View report or apply | Scout job → tactics link |
| P1 | `squad.open_profile` | squad | First squad visit | first row / profile entry | Open player profile | 2-click to akte (PRD 09) |
| P1 | `campus.auto_youth` | campus | First campus visit | campus overview | Continue | PRD 03: auto sim, no lineups |
| P2 | `campus.inbox_promote` | campus or hub | Youth promote/pull inbox item | linked inbox action | Resolve promote/pull | Decision inbox cap (4/week) |

---

## Phase 4 — Run the club (catalog)

**Goal:** Economy and meta when curtain allows; first visit per screen only.

| Prio | Step ID | Screen | Trigger / when | Coach target (TBD) | Complete when | Notes |
|------|---------|--------|----------------|-------------------|---------------|-------|
| P1 | `finances.cashflow_split` | finances | `finances_deep_nav` or first open | budget / cashflow panel | Continue | PRD 11; hub commerce crisis |
| P1 | `stadium.precinct_not_3d` | stadium | First stadium visit | precinct map | Continue | Non-3D editor (PRD 01) |
| P1 | `merch.matchday_orders` | merchandising | First merch visit or hub desk link | orders / SKU strip | Continue | Hub merch desk → screen |
| P2 | `transfers.market_basics` | transfers | `transfers_nav` visible | market list | Continue | Curtain-gated |
| P2 | `medical.fitness_risk` | medical | First medical visit | risk / ampel | Continue | Squad fitness tie-in |
| P2 | `leagues.table_context` | leagues | First leagues visit | table snippet | Continue | vs board objectives |
| P2 | `settings.save_export` | settings | First settings visit | save / export block | Continue | Help + PRD 18 pointer |
| P3 | `calendar.milestones` | calendar | First calendar visit | month grid / milestones | Continue | No scout CTA on calendar |
| P3 | `help.reset_tips` | help | Help → play / tips | reset coach marks control | Continue | F12.10 reset cross-link |

All Phase 4 steps: **`when(session)`** respects `resolveFeatureCurtain` (PRD 19).

---

## Implementation order (when building Phases 2–4)

1. Phase 2: postfach + matchday.
2. Phase 2: optional `hub.scout_match_week`.
3. Phase 3: scouting map + pool.
4. Phase 3: squad + campus.
5. Phase 4: curtain-gated economy / transfers.

Per step: `data-coach-target` → `TUTORIAL_STEPS` entry → i18n de/en/zh-Hans → optional non-training mission row in checklist.

---

## References

- Implementation: `src/tutorial/`, `src/ui/tutorial/`
- i18n: `tutorial.*` keys (origin recap branches)
- Playtest: `docs/prd/playtest_protocol.md`
