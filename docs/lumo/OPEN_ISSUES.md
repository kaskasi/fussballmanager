# Open issues & gaps (PRD 15 + PRD 10)

**Source:** `docs/prd/15_feature_gap.md` v1.11 (2026-10-04), cross-check `10_feature_list.md`  
**Intent:** What is **not done**, **thin in UI**, or **blocked** — not a task board. Shipping order stays in PRD 10 milestones.

---

## Active catalog slice (highest product priority)

Per PRD 15.5.1 (2026-10-06), after sponsor deals (F6.5 done):

1. **F7.3 — Hospitality / precinct (Hotel + Restaurant)**  
   Backend (`hospitality.ts`, `precinct.ts`) exists; **UI and story depth still thin**. Museum and full Wurst-SKU deferred inside F7.3. Farm/kiosk cash partially there.

2. **Then (not blocked):** **F4.4 Scout map** (regions colored by knowledge, pins) **or** **PRD 14.3 player profile density** (hex + full skill list on player file).

---

## Largest feature gaps (by impact)

| Priority | ID | Milestone | Gap |
|----------|-----|-----------|-----|
| High | **F4.4** | M2 | Scout **map** not built — network is list/tiers only (F4.3 partial). |
| High | **F5.4** | M2 | Full **contract negotiations** (player priorities, fog, frustration spiral) — youth contracts still default; slider UX tied to 2002 campaign USP. |
| High | **PRD 14.3** | M1 polish | **Player profile** behind spec: tabs/flavor exist; dense hex + full attribute list missing. |
| Medium | **F6.7** | M3 | **Merchandise / Fanshop SKU** — separate from shirt sponsor (F6.5). Not started. |
| Medium | **F7.3** | M3 | Neighbour buildings: **Wurst SKU**, museum, 1×1 deco later; hotel/restaurant need UX. |
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

**Later bucket:** regional leagues, story events, director + commentary depth → PRD 12/13/16.

---

## How to use with Lumo / other LLMs

1. Treat **PRD 10** as the feature allow-list.  
2. Treat **PRD 15** as gap truth — do not promote **C2** or **13_meta** ideas without PRD edits.  
3. For UI work, **design.md** wins over informal screenshots.  
4. Refresh `screens-six-up.png` when Hub shell or primary pipelines change.
