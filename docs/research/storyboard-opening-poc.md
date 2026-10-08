# Storyboard opening POC — evaluation

**Date:** 2026-10-08  
**Status:** Awaiting product rubric (Jan)  
**Entry:** `npm run dev` → `http://localhost:5173/?storyboard=poc`

## Hypothesis

Short **visual panels** (Nordstern crisis + origin branch) hook underdog fantasy with **less reading** than [`OpeningStoryModal`](../src/ui/components/OpeningStoryModal.tsx) step 3 + [`originOpeningBody`](../src/narrative/render.ts).

Assembly for this POC is **external to gameplay**: vector panels baked via [`scripts/bake-storyboard-poc.mjs`](../scripts/bake-storyboard-poc.mjs). No `opening_complete` change. In-app layer compositor is **deferred** until art passes rubric.

## Assets

| Artifact | Path |
|----------|------|
| Panel SVGs (source + ship) | [`docs/design-refs/storyboard-opening-poc/panels/`](../design-refs/storyboard-opening-poc/panels/), [`public/assets/storyboard-poc/panels/`](../public/assets/storyboard-poc/panels/) |
| Contact sheet | [`docs/design-refs/storyboard-opening-poc/contact-sheet.svg`](../design-refs/storyboard-opening-poc/contact-sheet.svg) |
| Attribution | [`docs/design-refs/storyboard-opening-poc/ATTRIBUTION.md`](../design-refs/storyboard-opening-poc/ATTRIBUTION.md) |

Regenerate: `npm run bake:storyboard-poc`

## Sequences (in dev viewer)

| ID | Panels | Purpose |
|----|--------|---------|
| `cold_open` | 5 | FC Nordstern, no manager |
| `passionate_letter` | 5 + 6 | Full **Der Brief** branch |
| `raffle_stub` | 5 + 2 | Losgewinn stub |
| `community_stub` | 5 + 2 | Gemeinschaft stub |
| `full_demo` | 5 + 6 + 1 + 1 | Quick mix |

Data: [`src/narrative/storyboard-poc-sequence.ts`](../src/narrative/storyboard-poc-sequence.ts)

## Word count (player-visible captions)

Counts are **caption lines only** (one short line per panel), DE strings from i18n `storyboard.poc.*`.

| Sequence | Panels | Caption words (DE, approx.) |
|----------|--------|-------------------------------|
| Cold open | 5 | ~25 |
| Passionate letter (incl. cold open) | 11 | ~55 |
| Raffle stub | 7 | ~35 |
| Community stub | 7 | ~35 |

**Baseline (text opening, step 3):** origin card hints + `originOpeningBody` + welcome lead ≈ **80–120 words** read before “Saison beginnen” (depends on locale and name step).

**Panel POC:** letter path ≈ **55 words** across 11 beats, but spread over time (less wall-of-text).

## Rubric (score 1–5 each — fill after review)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Engagement | _ | |
| Clarity | _ | |
| Cohesion (Fernsehnachmittag) | _ | |
| Cost (next origin ~1 day?) | _ | |
| Pacing (≤90s to season start when wired) | _ | |
| **Total** | _ / 25 | ≥18 → consider production path; &lt;15 → keep text modal |

## Recommendation

- [ ] **Ship** thin slideshow into opening (after art iteration)
- [ ] **Iterate** art externally (Figma/Inkscape) and re-bake
- [ ] **Abandon** for opening; optional rare 3-panel inbox beats only

_Product note:_ Phase 2 in-app compositor (`StoryboardPlayer`, layer kit) **not started** — intentional per plan.

## Technical notes

- Dev gate: [`src/main.tsx`](../src/main.tsx) renders [`StoryboardPocScreen`](../src/ui/screens/StoryboardPocScreen.tsx) when `?storyboard=poc`.
- Styles: `game-surfaces.css` `.storyboard-poc*`
- `prefers-reduced-motion`: list + contact sheet link
