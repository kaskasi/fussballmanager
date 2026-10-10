# Open issues & gaps (PRD 15 + PRD 10)

**Source:** `docs/prd/15_feature_gap.md` v1.11 (2026-10-04), cross-check `10_feature_list.md`  
**Intent:** What is **not done**, **thin in UI**, or **blocked** — not a task board. Shipping order stays in PRD 10 milestones.

---

## Active catalog slice (highest product priority)

Per PRD 15.5.1 (2026-10-06), after sponsor deals (F6.5 done):

1. **F7.3 — Hospitality / precinct**  
   **Done (v87):** Imbiss/Bier-Preissteuerung (Finanzen Commerce), Museum-Gebäude + Ledger, Hotel/Restaurant-Auslastung-UI, `empire_hotel_vs_pitch` Inbox. **Offen:** 1×1-Deko, zweites Campus-Gelände (PRD 14).

2. **Then (not blocked):** **F4.4 Scout map** (regions colored by knowledge, pins) **or** **PRD 14.3 player profile density** (hex + full skill list on player file).

---

## Largest feature gaps (by impact)

| Priority | ID | Milestone | Gap |
|----------|-----|-----------|-----|
| High | **F4.4** | M2 | Scout **map** not built — network is list/tiers only (F4.3 partial). |
| High | **F5.4** | M2 | Full **contract negotiations** (player priorities, fog, frustration spiral) — youth contracts still default; slider UX tied to 2002 campaign USP. |
| High | **PRD 14.3** | M1 polish | **Player profile** behind spec: tabs/flavor exist; dense hex + full attribute list missing. |
| Medium | **F6.7** | M3 | **Merch SKU** shipped (v79+); **v87** Kapazitäts-UX + kein Shop in Matchday-Kasse. Saisonkollektionen deferred. |
| Medium | **F7.3** | M3 | Kern shipped (v87); Rest: 1×1-Deko, F7.4–F7.6. |
| Medium | **F3.6** | M2 | Youth **pro contracts** + minutes clauses — shares F5.4 dialog. |
| Medium | **F4.7 / F4.8** | M2 | Shortlist sparklines, false positives (prodigy trap). |
| Medium | **F5.6** | M2 | AI transfer market discipline at full spec. |
| Lower (M3+) | **F1.9** | M3 | Live tactical intervention during match — do not pull forward. |
| Lower (M3+) | **F6.6** | M3 | Loans/investors — **blocked by v1 stack rule** until product lifts ban. |
| Blocked | **C2** | — | **Bloodline intake** beat — needs PRD 07/10 entry before any code (`F11.8` candidate). |
| Doc | **`13_meta.md`** | M4 | **Unwritten** — do not invent meta features until authored. |

---

## M1 closure — still called out in gap analysis

These are **catalog M1** but called “UI hinterher” or partial in PRD 15.3 / 15.6:

- **F3.2** Campus: report + stage grid OK; full **2D campus fantasy** vs iso city still evolving.
- **F1.5** Profiles vs **F2.7** heatmap: heatmap shipped on Hub/Training; **akte density** open (14.3).
- **F4.1/F4.2** Scouting knowledge: CI/bars exist; **F4.4 map** is the big missing M2 piece.
- **F5.1** Transfers: window next-actions exist; deep **F5.4** negotiations not.
- **F7.1** Stadium: footprint + bands + shirt slots; **F7.2** shop-under-map polish ongoing.

**M1 DoD** is a **player journey** test, not “every M1 row at 100% UI fidelity.”

---

## Built recently (context for agents — may outpace this file)

Check git/main for: Postfach UX (weekly youth mail, modals), opponent scout summary, training header warning, queue spoiler removal. Production deploy may lag `main`.

---

## Conscious refusals (not bugs)

From PRD 15.2 / PRD 10 non-features:

- No **relative potential** / star ceilings  
- No **manual youth XIs** or youth match viewing  
- No **3D**, **multiplayer**, **manager house/dating** sim  
- No **FuMaFu-style** weekly talent respec — stamps (F2.8) are identity  
- **Engine** folder is hands-off — wrapper only  

---

## Playtest backlog status

PRD 15.7: P0/P1/P2 items from `playtest_ideas.md` are largely **Done (2026-10-06)** (calendar chips, transfer week 2, economy pacing, retrain roll, portraits, camps grid, mobile layout, etc.).

**Priority (2026-10-08):** **[playtest_protocol.md](../prd/playtest_protocol.md)** — 4×30 min live observed sessions **before** major PRD 19 B–E / PRD 21 UI. Loop feel > more story scope.

**Later bucket:** regional leagues, story events, director + commentary depth → PRD 12/13/16.

---

## Visual cohesion & design system (PRD 20)

Lumo: SaaS/spreadsheet feel, inconsistent filter pills, modal chrome, background tokens, stock camp photos vs cartoon UI. Tracked in **[docs/prd/20_design_language.md](../prd/20_design_language.md)** — primitives (`FilterChip`, `ModalShell`), single CSS plane, gradient camp heroes, i18n layout pass. **Gates PRD 19** career UI slices B–E.

---

## Career acts & onboarding (PRD 19)

Product direction for tutorial season, three-act arc, and progressive UI curtain:
[docs/prd/19_career_acts.md](../prd/19_career_acts.md) and choice backlog
[19_story_choice_seeds.md](../prd/19_story_choice_seeds.md). Addresses Lumo
complexity via Act 1 auto-systems and hidden nav; implementation slice A in code
(`career_phase`, menu filter, auto training).

**Act 4 / Elite World NG+:** [21_career_act4_elite_world.md](../prd/21_career_act4_elite_world.md) — cup win, victory screen, elite `world_profile`. UI density tension (comic vs spreadsheet) → PRD 20 presentation modes.

---

## How to use with Lumo / other LLMs

1. Treat **PRD 10** as the feature allow-list.  
2. Treat **PRD 15** as gap truth — do not promote **C2** or **13_meta** ideas without PRD edits.  
3. For UI work, **design.md** wins over informal screenshots.  
4. Refresh `screens-six-up.png` when Hub shell or primary pipelines change.
