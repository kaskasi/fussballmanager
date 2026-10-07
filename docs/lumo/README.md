# Lumo / AI context package — The Club

**Purpose:** Give humans and LLMs a compact, accurate snapshot of *The Club* (Fußball-Manager): what it is, what ships in scope, what is still open, and how the live UI looks.

**Canonical product docs:** `docs/prd/*.md` (especially `10_feature_list.md`, `15_feature_gap.md`, `design.md`). This folder is a **derivative** — refresh screenshots and dates when the hub changes materially.

## Contents

| File | Use |
|------|-----|
| `screens-six-up.png` | Single 2×3 montage (Hub, Training, Inbox, Youth, Scouting, Finances) |
| `screens/` | Individual PNGs (`01-hub.png` … `06-finances.png`) |
| `FEATURE_CATALOG.md` | All **95** catalog features (PRD 10) by module and milestone |
| `OPEN_ISSUES.md` | Largest gaps, active slices, and non-goals (PRD 15 + 10) |
| `scripts/composite-six-up.mjs` | Regenerate montage after replacing screenshots |

## Product one-liner

Text- and event-driven **2D** football management sim: you run the club as a **business** (economy, stadium, development) and as a **sporting** operation. Matches are **simulated**, not played; one match engine event stream feeds commentary and SVG pitch view. **No fixed potential** — growth uses PRD 02 formulas with hidden `anlage` / `drive`. Youth teams are **fully auto-simulated**; you decide via reports and a capped decision inbox (max 4/week).

## Stack (for agents)

- **Client:** React + TypeScript (strict), match/week sim in browser (PRD 17)
- **Engine:** `server/src/engine/` — **do not edit**; wrap only
- **DB / server:** Node + Fastify + PostgreSQL (dev APIs); production worker = static SPA
- **LLM:** local Ollama if used — no cloud LLM in repo by default
- **UI:** `docs/prd/design.md` — design tokens, Lucide/Kenney, one yellow **NEXT** in header

## Live demo

Screenshots captured from: `https://fussi.imgarten.party/` (FC Nordstern save, 2026-10-07).

## Regenerate screenshots

1. Open the deployed app or `npm run dev` locally.
2. Capture viewport PNGs into `screens/01-hub.png` … `06-finances.png` (same names).
3. From repo root: `npm install sharp` (if needed), then `node docs/lumo/scripts/composite-six-up.mjs`.

## Suggested LLM prompt prefix

```text
You are helping on "The Club", a 2D football management sim. Read docs/lumo/README.md,
FEATURE_CATALOG.md, and OPEN_ISSUES.md for scope. PRD under docs/prd/ is law.
Never change server/src/engine/. No 3D, no relative potential stars, no manual youth lineups.
```
