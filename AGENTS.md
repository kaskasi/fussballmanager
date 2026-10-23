# AGENTS.md

Project: **The Club** (football management sim). Full PRD: `docs/PRD.md` — check it before major architecture decisions.

## What this is
A text- and event-driven football management sim (no 3D). An event-driven match engine is the single source of truth. The live matchday is text-first: a commentary stream plus visuals derived from events (momentum, zones, stats) — no live 2D pitch (ADR 0004). The 2D pitch exists only on the lineup screen. Engine changes follow the calibration rule in ADR 0003.

## Non-negotiables
- No 3D anywhere (match rendering, stadium editor). If a request implies 3D, flag it instead of implementing it.
- No multiplayer / shared leagues.
- UI visual language: `docs/prd/design.md` (tokens, header, §9 wireframes). Reference images: `docs/design-refs/`. Emojis forbidden globally except Postfach mail/archive (design.md §4.2).
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

## Scope discipline
When in doubt about whether something is in scope, check `docs/PRD.md` Section 4 (Scope table) before building it. Things explicitly rejected: 3D rendering, multiplayer, deep financial instruments (loans/debt/investors) in v1.
