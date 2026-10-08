# /docs/prd/21_career_act4_elite_world.md

**Version:** 1.0  
**Last Updated:** 2026-10-08  
**Status:** Draft (product law for Act 4 completion + Elite World New Game+)

---

## Purpose

Define **Act 4**: canonical **career completion** after winning the international cup (F10.6), the **victory end screen**, unlock of a **career-select main menu**, and optional **Elite World** careers — same simulation pillars, **reduced story**, **denser FM-lean UI** ([PRD 20](./20_design_language.md) `manager_desk` mode), procedurally generated **elite_fantasy** worlds without trademarked leagues, crests, or player likenesses.

**Dependencies:** PRD 01, 08, 09, 10, 12, 13, 14, 19, 20

**Related:** [19_story_choice_seeds.md](./19_story_choice_seeds.md), [playtest_protocol.md](./playtest_protocol.md)

---

## Scope

**In:**

- Phase `act4_complete` on save after sim-derived international cup win
- Beat id `empire_international_cup_won` (idempotent)
- Full-screen **VictoryEndScreen** (“kill screen” stinger) → career unlock
- Client **CareerUnlockProfile** (local prefs, not savegame meta-currency)
- New career bootstrap: `career_phase: elite_world`, `world_profile: elite_fantasy`
- Legal naming matrix (procedural fiction; counsel before ship)
- UI surfaces: TitleCareerSelect, EliteWorldSetup (spec + wireframe pointers)

**Out (v1 of this PRD):**

- Code, migrations, `save_version` bump (follow-up after sign-off)
- Licensed real leagues / official logos / celebrity likeness
- Cross-save import of Nordstern youths (`PRD 19` open Q2)
- Roguelike meta bonuses between saves
- Generative art, 3D, multiplayer, cloud

---

## Relationship to PRD 19

```text
act1_nordstern → act2_regional → act3_empire → [win F10.6 final] → act4_complete
                                                      ↓
                         client unlock: elite_world_careers (profile-level)
                                                      ↓
                         optional new save → elite_world + world_profile elite_fantasy
```

| Lane | Entry | Story density | UI mode (PRD 20) |
|------|-------|---------------|------------------|
| Underdog saga (Acts 1–3) | Default new game → Nordstern | High curtain + cast | `storybook` |
| Elite World (Act 4 NG+) | After unlock only | Minimal scripted beats | `manager_desk` |
| `full` | Legacy / debug | PRD 13 baseline | `manager_desk` default |

**Not Inscryption:** no genre swap, no deckbuilder pivot, no fourth-wall horror. Familiar **completion unlock → optional second career** only.

**PRD 01:** Elite World is **not** a roguelike run loop or meta-currency grind; it is an **optional new save** after beating the underdog arc.

---

## Victory trigger (sim truth)

**Condition:** Player’s club wins the **international cup final** while `career_phase === act3_empire` (or `full` if product allows dynasty path — default: Act 3 only).

**Detection:** Match result from engine wrapper only; no hand-authored score.

**Effects (allowed):**

- Fire beat `empire_international_cup_won` once (`beats_fired`)
- Chronicle + trophy entry (F11.4)
- Set `career_phase = "act4_complete"`
- Set client `elite_world_unlocked: true` with `source_save_slot`

**Forbidden:** Invented goals, forced cup win without playing the final, retroactive table edits.

---

## Victory end presentation

**Surface:** `VictoryEndScreen` — full viewport interstitial (not header-NEXT).

| Element | Spec |
|---------|------|
| Tone | Earned, PRD 01 — can be abrupt; not cozy bait |
| Visual | Trophy, one chronicle line; optional storyboard panel (Acts 1–3 POC style) |
| Actions | **Unlock Elite World** (primary) · **View chronicle** · **Continue dynasty** (optional product — default defer) · **Done** → TitleCareerSelect if unlocked |

Wireframe pointers: PRD 09 §09.6, PRD 14 §14.14.

---

## Main menu unlock

**First launch (shipping default):** Opening modal → FC Nordstern Act 1 — **no** title hub.

**After `elite_world_unlocked`:**

| Option | Behavior |
|--------|----------|
| **Underdog saga** | New save → `act1_nordstern`, `world_profile: fictional_regional` (PRD 12 default) |
| **Elite world** | New save → `elite_world`, `world_profile: elite_fantasy` |

**Persistence (client profile, not leaderboard):**

```typescript
interface CareerUnlockProfile {
  elite_world_unlocked: boolean;
  unlocked_at?: string; // ISO
  source_save_slot?: string;
}
```

Store in local prefs / F12.4-adjacent settings blob — **not** in shared cloud.

**Dev:** `?elite_world=1` mocks unlock + setup without completing Act 3.

---

## Elite World career

### Simulation

- Same growth engine, transfers, economy, match wrapper (Gesetz 4).
- Feature curtain: **all pillars on**; no Act 1 auto-training injection.
- Story inbox cap **4** unchanged; **fewer** scripted beats; fan feed optional off.

### World generation (`world_profile: elite_fantasy`)

Extends PRD 12 — **not** M1 default; ships with Act 4 / F10.8 subset.

| Aspect | Rule |
|--------|------|
| Leagues / nations | Multi-league fantasy (F10.8 roadmap); tier labels procedural |
| Club names | Real **city** names (factual geography) + **fictional** club suffixes — never trademarked club strings |
| Players | High-CA pools; UI archetypes (“world-class striker”); **no** real names or likenesses in shipped UI |
| Crests | Generic procedural crests only (`public/assets/club-logos/` pipeline) |
| Portraits | Open Peeps / silhouettes only |

**Setup UI:** `EliteWorldSetup` — pick nation tier, league band, employer club from generated list (exact UX TBD).

### Presentation

- `presentation_mode: manager_desk` (PRD 20) — denser tables, less illustration chrome.
- Same primitives (`FilterChip`, `ModalShell`, `StatTable`).

---

## Legal and naming policy

**Product analogy:** Historical FM-style use of procedural names without official league packs — **not legal advice**.

| Allowed | Forbidden |
|---------|-----------|
| Fictional club names inspired by city + sport pattern | Official league logos, UEFA/FIFA marks, club trademarks |
| Tier labels (“Top flight”, “Division 2”) | Exact spellings of protected club names when counsel flags |
| Phonetic **near-miss** names | Celebrity / player likeness (image or “this is Haaland”) |
| Real city names as geography facts | Implying official licensing in marketing |

Optional generator flag `phonetic_star_names` — **default off** until legal review.

Maintain `docs/legal/elite-world-naming.md` (stub) before public beta.

---

## Persisted state (spec)

```typescript
// story_state — completing Act 3 cup
type CareerPhase =
  | "act1_nordstern"
  | "act2_regional"
  | "act3_empire"
  | "act4_complete"   // terminal for underdog arc on this save
  | "elite_world"       // new NG+ save only
  | "full";

// world manifest (PRD 12 extension)
type WorldProfile = "fictional_regional" | "elite_fantasy";
```

**Migration:** TBD when implementing; bump `save_version` + migration file per project rules.

---

## Story–Sim Input Boundary

Story and acts **must not** instruct the match engine to produce a fixed result. They **may** alter **inputs** to the wrapper (lineup eligibility, availability, morale systems already in save).

See PRD 01 § Story–Sim Input Boundary and PRD 19 pillar 2 (structural underdog).

---

## Feature mapping

| ID | Role |
|----|------|
| F10.6 | International cup — Act 3 win gate |
| F10.8 | Multi-league elite world (dependency) |
| F11.4 | Chronicle / trophy on completion |
| F12.1 | Saves; unlock profile adjacent to prefs |
| F12.9 (proposed) | Career unlock profile — footnote in PRD 10 |

---

## Implementation slices

| Slice | Deliverable |
|-------|-------------|
| A | This PRD + cross-links (**docs**) |
| B | Cup win detect + `act4_complete` + beat |
| C | VictoryEndScreen |
| D | CareerUnlockProfile + TitleCareerSelect |
| E | `elite_fantasy` generator profile + EliteWorldSetup |
| F | Legal naming pass + `docs/legal/elite-world-naming.md` |

**Gate:** [playtest_protocol.md](./playtest_protocol.md) — first **2 × 30 min** sessions before slices C–E without readout.

---

## Open product questions

1. **Dynasty:** Continue same save after cup win vs hard end at `act4_complete`?
2. **Unlock limits:** One elite save per unlock vs unlimited new elite careers?
3. **Phonetic star names:** On by default in elite world?
4. **Steam:** Achievement on cup win vs on first elite save?

---

## Invariants

| Rule | Check |
|------|-------|
| Gesetz 4 | `server/src/engine/` untouched |
| PRD 01 | No invented match outcomes; Input Boundary respected |
| PRD 01 | No roguelike meta-currency |
| PRD 13 | Inbox cap 4 |
| PRD 20 | Elite UI uses tokens + `manager_desk` |

---

## References

- [19_career_acts.md](./19_career_acts.md)
- [20_design_language.md](./20_design_language.md) — presentation modes
- [12_league_world.md](./12_league_world.md) — `world_profile`
- [playtest_protocol.md](./playtest_protocol.md)
