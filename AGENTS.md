# AGENTS.md

Project: **The Club** (football management sim). PRD map: `docs/prd/INDEX.md` (one line per doc) — check the relevant PRD before major architecture decisions. Numbered PRDs win over the archived `docs/prd/PRD.md`.

## What this is
A text- and event-driven football management sim (no 3D). An event-driven match engine is the single source of truth. The live matchday is text-first: a commentary stream plus visuals derived from events (momentum, zones, stats) — no live 2D pitch (ADR 0004). The 2D pitch exists only on the lineup screen. Engine changes follow the calibration rule in ADR 0003.

## Non-negotiables
- No 3D anywhere (match rendering, stadium editor). If a request implies 3D, flag it instead of implementing it.
- No multiplayer / shared leagues.
- UI visual language: `docs/prd/design.md` (tokens, header, icons, layout, Definition of Done). Wireframes: one file per screen, `docs/prd/design/09.NN-<screen>.md` (= design.md §9.NN) — read only the screen you touch. Reference images: `docs/design-refs/`. Emojis forbidden globally except Postfach mail/archive (design.md §4.2).
- UI defaults to text but is not text-only: anything morale/finance/quality/relationship-related that communicates better visually (color, icons, charts, SVG/CSS) should be visual, not a wall of numbers. No generative image AI in shipped assets (PRD 01).
- LLM support is local-first (Ollama/Llama), not cloud-API-first. Don't wire in a cloud LLM call without being asked.
- Staff-authored AI content (coach advice, scout reports) must reflect that staff member's in-game skill attribute — don't give every staff member the same quality of output.

## Tech stack
- Frontend: React + TypeScript (strict)
- Match/pitch visualization: SVG first, Canvas only if performance requires it
- Backend: Node.js + Fastify, TypeScript
- Database: PostgreSQL
- LLM: local via Ollama
- Visual assets: SVG/CSS/typography or declared CC0 — never generative image AI unless product explicitly reverses PRD 01

## Core pillars (all ship in v1, Tactics/Transfers/Economy weighted highest)
Tactics & Formations · Transfers & Scouting · Club Economy (finances + matchday commerce + simple non-3D stadium editor + league TV/prize money) · Youth Development · Staff Management · Press & Morale

## Save compatibility (pre-release)
Until GA: **PRD 08.10** — only current `SAVE_VERSION` loads; still bump `save_version` + migration file on schema edits, but no legacy migration guarantee for players.

## Working cheaply (context budget)
- Locale packs `src/i18n/locales/*.json` are ~200 KB each: never read them whole. Find keys with `rg -n '"prefix\.' src/i18n/locales/en.json`; add or change strings in all three with `echo '{"de":{…},"en":{…},"zh-Hans":{…}}' | npm run -s i18n:add`.
- Search with `rg` (honors `.ignore`); for code, `rg -t ts PATTERN src server shared`. Don't `grep -r` from the repo root: it scans multi-MB SVGs.
- Large files (`src/index.css` ~8.5k lines, `src/App.tsx` ~2.2k): rg for the selector or symbol, then read a line range.

## Scope discipline
When in doubt about whether something is in scope, check `docs/prd/10_feature_list.md` (feature catalog) and the scope table in `docs/prd/PRD.md` §4 before building it. Things explicitly rejected: 3D rendering, multiplayer, deep financial instruments (loans/debt/investors) in v1.
