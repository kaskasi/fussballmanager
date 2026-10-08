# /docs/prd/19_career_acts.md

**Version:** 1.1  
**Last Updated:** 2026-10-08  
**Status:** Draft (product law for career acts — supersedes informal discussion only)

---

## Purpose

Define the **three-act career arc**, **tutorial-first season** (FC Nordstern), **feature curtain** (progressive UI/system exposure), **employer transition** after scripted relegation, and **delayed narrative choices** (Mass Effect lane). Simulation remains full fidelity behind the curtain; presentation simplifies early play.

**Dependencies:** PRD 01 (vision), 09 (screens), 10 (features), 12 (world/Nordstern), 13 (story slice), 14 (cockpit), 15 (gaps), **20 (design language — gate for slices B–E)**, **21 (Act 4 / Elite World — completion arc)**

**Related:** [19_story_choice_seeds.md](./19_story_choice_seeds.md) — choice/payoff backlog · [21_career_act4_elite_world.md](./21_career_act4_elite_world.md)

---

## Scope

**In:**

- Career phases `act1_nordstern` → `act2_regional` → `act3_empire` → `act4_complete` (+ `elite_world` on NG+ save; `full` for legacy / sandbox)
- Feature curtain matrix (nav, screens, editable systems)
- Act 1: auto home-region scouting (scripted), auto training plan, formation-only tactics (no sliders) — *tactics curtain v1 may be UI-only*
- Act 1 end: **relegation as narrative success** + job offer to Act 2 club
- `story_state` extensions: `career_phase`, `feature_curtain`, `choices`, `scheduled_payoffs`
- Onboarding beat after opening: “Run the club with NEXT”

**Out (v1 of this PRD):**

- Full Act 2–3 authored content and employer worldgen
- Cross-save meta progression (`13_meta.md`)
- Global leaderboards / multiplayer social proof
- Inscryption-style genre swap or fourth-wall breaks
- Invented match scores or transfers from story scripts

---

## Design pillars

### 1. Sim + presentation (curtain)

| Layer | Responsibility |
|-------|----------------|
| **Sim** | Growth, engine wrapper, league, finances, saves — unchanged contracts |
| **Presentation** | `resolveCareerPresentation(storyState)` → visible nav, auto-training, warnings |

Code facade: [`src/narrative/career-presentation.ts`](../../src/narrative/career-presentation.ts).

### 2. Act 1 = guided failure (structural, not scripted scores)

- **Player win:** bond with 2–3 youths, see growth heatmap move, survive the *story* of a poor club.
- **Table loss:** relegation is **expected** and triggers Act 2 transition (not game over) — must still emerge from **played fixtures** and roster/budget reality (PRD 12 Nordstern underdog band), not a “force loss” flag on the match engine.
- **Board:** PRD 13 survival objectives remain; pressure curve may be tuned so drop feels earned, not random.
- **Story–Sim Input Boundary (PRD 01):** beats may set availability (`injured`, `banned`, `awol`, `holiday`, international duty) and morale/board pressure; they may **not** invent scores or tell the engine to lose a specific match.

### 3. Feature unlock = story beat

Each unlock ships: **one chronicle line + one cast beat + one curtain flag** (PRD 09/14).

### 4. Consequences

- **Canon choices:** stored in `story_state.choices`, payoffs in `scheduled_payoffs` (due season/week).
- **Effects:** only PRD 13 allow-list (morale, fanbase, board pressure, cash, `media_hype`, hospitality beats).
- **Not canon:** flavor gimmicks with tiny stat nudges (optional, clearly labeled).

### 5. North star (abstract)

Teach a **tight loop** (NEXT → week → growth → one decision), then **earn complexity** through acts — appropriate for football management, not deckbuilder pivots.

---

## Career phases

```text
act1_nordstern   Tutorial season · FC Nordstern · curtain heavy
       ↓ relegation + offer beat (employer switch TBD)
act2_regional    Patient chairman · unlock pillars one-by-one
       ↓ promotion to regional top tier (win condition Act 2)
act3_empire      National success · camps/market depth · F10.6 path
       ↓ win international cup final (sim-derived)
act4_complete    Underdog arc complete on this save · unlock Elite World (client profile)
       ↓ optional new save
elite_world      Elite fantasy career (PRD 21) · reduced story · manager_desk UI
full             No curtain (existing saves, sandbox, debug)
```

| Phase | Club | Primary fantasy | Promotion / gate |
|-------|------|-----------------|------------------|
| Act 1 | FC Nordstern (fixed) | Wild ride, learn development feel | Relegation → leave/offer |
| Act 2 | **TBD:** fixed fictional club *or* procedural lower-league employer | Build regional power with time | Promotion to regional liga top |
| Act 3 | Same save, upgraded ambitions | Empire, longevity | Win F10.6 international cup |
| Act 4 complete | Same save (terminal story state) | Closure + unlock | Cup win → VictoryEndScreen (PRD 21) |
| Elite World | New save after unlock | Top-flight fantasy | `world_profile: elite_fantasy` (PRD 21) |

**Open (product):** Act 2 club authoring, chronicle carry of “legend youths” from Nordstern, replay Act 1 as sandbox — see §12. Dynasty play after cup vs hard end → PRD 21 open Q1.

---

## Feature curtain matrix

Legend: **show** = nav + screen accessible · **hide** = menu omitted · **auto** = sim runs, UI read-only or assistant-owned · **manual** = player edits

### Act 1 — `act1_nordstern`

| Surface / system | Mode | Notes |
|------------------|------|-------|
| Hub, Postfach, Youth (U17/U19), Squad (read), Calendar, Leagues | show | Youth inbox cap 4 unchanged |
| Training | auto | Assistant fills 15 slots weekly; no header “training missing” warn |
| Scouting, Transfers, Stadium, Finances (commerce depth) | hide | Home bootstrap still runs in sim if already wired |
| Tactics | formation only | Presets/sliders hidden until Act 2 beat (UI follow-up) |
| Help | show | Contextual tips only |
| Opponent video analysis (F4.10) | hide | Unlocked via salesman inbox in Act 2 |

### Act 2 — `act2_regional` (spec)

Unlock order (illustrative — beats in story seeds):

1. Stadium / precinct (F7.1)
2. Scouting regions beyond home (F4.3/F4.4)
3. Manual training (F2.1)
4. Opponent scout bundle (F4.10) — salesman decision
5. Transfers window depth (F5.1)

### Act 3 — `act3_empire` (spec)

- Full catalog surfaces for M2/M3 economy and camps (F3.9, F7.3, F10.6).
- International cup path (F10.6) is the **Act 3 win gate** toward PRD 21.

### Act 4 — `act4_complete` / `elite_world`

- See [21_career_act4_elite_world.md](./21_career_act4_elite_world.md). Presentation: PRD 20 `manager_desk` for elite saves.

### Full — `full`

All screens visible; manual training; no auto plan injection.

---

## Persisted state

Extends PRD 13 `pipeline.story_state`:

```typescript
type CareerPhase =
  | "act1_nordstern"
  | "act2_regional"
  | "act3_empire"
  | "act4_complete"
  | "elite_world"
  | "full";

interface StoryChoiceRecord {
  season: number;
  week: number;
  option_id: string;
}

interface ScheduledPayoff {
  id: string;
  choice_id: string;
  due_season: number;
  due_week: number;
  effect: string; // template id → PRD 13 allow-list resolver
}

interface FeatureCurtain {
  auto_training: boolean;
  manual_training: boolean;
  scouting_nav: boolean;
  transfers_nav: boolean;
  stadium_nav: boolean;
  finances_deep_nav: boolean;
  opponent_scout_module: boolean;
  tactics_sliders: boolean;
}

// story_state additions:
career_phase: CareerPhase;
feature_curtain: FeatureCurtain;
choices: Record<string, StoryChoiceRecord>;
scheduled_payoffs: ScheduledPayoff[];
```

**Migration:** `migration_072_career_acts` — existing saves → `career_phase: "full"`, default curtain all-on.

**New games:** `initializeStoryForNewGame` → `act1_nordstern` + Act 1 curtain.

---

## Onboarding flow

| Step | When | Content |
|------|------|---------|
| 0 | PRD 13 + F12.8 | Language → name → origin → captain |
| 1 | First hub visit after opening | Single panel: week advances with **NEXT**; no CA glossary |
| 2 | Weeks 1–N Act 1 | Hub + youth decisions; hidden nav per matrix |
| 3 | Post-relegation | Chronicle + chairman VO; curtain expands for Act 2 |

---

## Employer transition (Act 1 → 2)

**Trigger:** Relegation confirmed at season end *or* dedicated story beat when `active_arc` completes.

**Effects (allowed):**

- Update `board.employer_club_id`, league attachment, objectives (patient chairman template).
- Chronicle entry referencing Nordstern youths (by id list in `story_state` if tracked).
- Set `career_phase = "act2_regional"` and refresh `feature_curtain`.

**Forbidden:** Teleport league position without sim; delete player growth history.

*Implementation of club swap is a follow-up task after Act 2 club is chosen in §12.*

---

## Invarianten

| Regel | Prüfung |
|-------|---------|
| Gesetz 4 | Engine untouched |
| Gesetz 6 | No youth XIs |
| PRD 13 inbox cap | 4 open decisions |
| PRD 01 amended | No roguelike **runs**; delayed choices OK |
| PRD 10 | No multiplayer leaderboard |
| Curtain | Hidden nav must not leave dead-end without NEXT/back |

---

## Implementation slices

| Slice | Status | Deliverable |
|-------|--------|-------------|
| A | **v1 shipped** | `career_phase`, `feature_curtain`, migration 072, menu filter, auto training after week sim |
| B | Planned | Opening “NEXT” coach panel — **blocked until PRD 20 P0–P2 DoD** and [playtest_protocol.md](./playtest_protocol.md) session 2 readout |
| C | Planned | Act 1 relegation → phase `act2_regional` (chronicle only until employer spec) |
| D | Planned | Choice/payoff resolver + first 3 canon beats from seeds doc |
| E | Planned | Tactics formation-only UI |

---

## References

- Story choice backlog: [19_story_choice_seeds.md](./19_story_choice_seeds.md)
- Act 4 / Elite World: [21_career_act4_elite_world.md](./21_career_act4_elite_world.md)
- Playtest gate: [playtest_protocol.md](./playtest_protocol.md)
- PRD 13 effects allow-list
- Lumo package: `docs/lumo/OPEN_ISSUES.md` (pointer)

---

## 12. Open product questions

1. Act 2 club: fixed narrative club vs procedural employer?
2. Save continuity: same chronicle vs import “legends” only?
3. Nordstern replayable as sandbox after Act 1?
4. Act 3 gate: PRD 12 regions only vs F10.6 cup?
5. ~~End transform~~ → **Resolved:** PRD 21 Act 4 completion + Elite World unlock (not credits-only).
