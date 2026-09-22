# PRD: Football Manager Game (working title)

> **Archiv, nicht verbindlich.** Es gilt `.cursor/rules/main.mdc` und die nummerierten Dateien in diesem Ordner (`02`–`10`). Diese Datei ist die ältere Vision (Taktik und Wirtschaft zuerst, Match-Engine als Produkt). Bei Widerspruch gewinnen die nummerierten PRDs. Die Match-Engine bleibt eingefroren; der Wrapper steht in den neuen Specs.

**Draft v0.2** — living document, update as design decisions firm up.

## 1. Vision & Motivation

Existing football management games have drifted in one of two directions: Sega's Football Manager has become an increasingly dense spreadsheet experience, while EA's FIFA Manager — which balanced tactics with a genuinely engaging club economy — was discontinued. This project aims to recapture that balance: a deep, event-driven match simulation paired with a real economic layer, presented through a clean, readable interface rather than a wall of tables.

Built by a solo hobbyist developer as a passion project, with the door open to polish and ship it later if it turns out well.

## 2. Goals

- Deliver a match engine that simulates football **event by event** (not just aggregate probability rolls), enabling emergent, believable match stories.
- Make club economics — including its commercial side — a first-class, engaging pillar, not an afterthought. The player runs the club as a business, not only its sporting side ("Uli Hoeneß, not just Ralf Rangnick").
- Present the game primarily through text (reports, commentary, dialogue) complemented by a lightweight 2D visual layer for matchday, plus AI-generated imagery wherever a visual communicates better than text.
- Use dynamically generated (LLM-driven) content to eliminate the "solved", repetitive interactions long-time management-game players learn to autopilot.
- Ship a Minimum **Lovable** Product — deep enough to be genuinely engaging over multiple seasons, not just a tech demo.

## 3. Target Player

Experienced football-management genre players (Football Manager, FIFA Manager veterans) who want tactical and economic depth delivered through a modern, less spreadsheet-heavy interface. Solo/offline play; no multiplayer requirement.

## 4. Scope: In vs. Out (v1 / MLP)

| Area | v1 / MLP | Status |
|---|---|---|
| Match engine | Event-by-event simulation (passes, duels, chances, cards, injuries) | In |
| World | Real-world-inspired but fully fictional clubs, players, leagues | In |
| Competition structure | Multiple divisions with promotion/relegation, across multiple seasons | In |
| Tactics & formations | Formation builder, roles/instructions, in-match tweaks | In |
| Transfers & scouting | Transfer market, scouting network, negotiations | In |
| Club economy | Finances, wages, sponsorships, matchday commerce (concessions/merchandise pricing), simple non-3D stadium editor, league TV money & prize pools | In |
| Youth development | Youth academy, player progression/regression | In |
| Staff management | Coaching staff, scouts, medical staff with their own attributes | In |
| Press & morale | Press conferences and dressing-room dynamics, LLM-generated, can subtly affect morale/relationships | In |
| Matchday visualization | 2D top-down pitch view (icons/dots + ball) synced to match events, alongside live text commentary | In |
| AI-generated imagery | Icons, backgrounds, placeholder graphics generated rather than hand-drawn, used throughout the UI | In |
| Tactics-board visualization | Using the pitch view for set-piece/tactics planning (not just live matchday) | Out — backlog |
| Extended economy | Deeper financial modeling (loans, debt, investors, market inflation, dynamic pricing curves) | Out — backlog |
| Multiplayer / shared leagues | — | Out of scope |
| 3D match/stadium rendering | — | Explicitly rejected |

## 5. Core Pillars (v1)

All pillars ship in v1; Tactics/Transfers and Club Economy are weighted highest.

- **Tactics & Formations** — formation setup, roles, instructions, live in-match adjustments driven by the event engine.
- **Transfers & Scouting** — market activity, scouting reports (LLM-flavored), negotiations, contracts.
- **Club Economy** — wages, sponsorships, matchday commerce, a simple stadium editor, league TV money and prize pools. The differentiator vs. Sega FM.
- **Youth Development** — academy intake, training, player growth curves.
- **Staff Management** — coaches, scouts, medical staff with their own skills and progression.
- **Press & Morale** — dynamically generated press conferences and dialogue that can subtly move morale/relationships.

## 6. Match Simulation

### 6.1 Engine philosophy
The match engine drives everything else: it generates a believable sequence of discrete events (kickoff, passing phases, duels, shots, cards, injuries, substitutions) shaped by tactics, attributes, form, and fatigue — not a single probability roll. This event stream is the shared source of truth for both the text commentary feed and the 2D pitch visualization, so the two views stay in sync.

### 6.2 Presentation layers (from one event stream)
- **Text commentary feed** — running, LLM-flavored commentary reacting to engine events in real time.
- **2D pitch visualization** — top-down view with player icons/dots and a ball, representing the same event stream. Matchday only in v1.

## 7. Club Economy

Four layers in v1 — the player runs the club as a business:

1. **Club finances** — wage/transfer budgets, sponsorship income, ticket revenue.
2. **Matchday commerce** — concessions and merchandise pricing (e.g. sausages/beer/shirts) as a real revenue lever.
3. **Investment** — a simple, non-3D stadium editor (stand capacity, VIP boxes, facility quality) plus basic infrastructure (training facilities, academy quality).
4. **League macro-economy** — TV revenue and prize money tied to league position and results.

Deeper mechanics (loans/debt, investors, market-wide inflation) are deferred past v1 — architect the model so these can be layered in later without a rewrite.

## 8. Competition Structure

Multiple divisions from the start, played across multiple in-game seasons, with promotion/relegation. Chosen because the club-economy and squad-building loop only becomes meaningful across seasons and tiers.

## 9. AI-Generated Content

LLM-generated content targets rote, "solved" interactions — press conferences, agent/player conversations, scouting write-ups. Not purely cosmetic: responses can subtly influence morale and relationships.

**Feedback quality is gated by staff skill.** Staff-authored content (a coach's tactical suggestion, a scout's report) should reflect that staff member's in-game attributes — a low-rated coach gives vaguer, less reliable advice than a top-rated one.

**AI-generated imagery, not just text.** Icons, background art, and placeholder graphics (e.g. a sausage stand, a VIP box) are generated rather than hand-drawn — a first-class part of the MLP UI, not later polish.

**Local-first AI.** Text LLM support runs locally (a local Llama model via Ollama) rather than a cloud API from day one. Image generation likely needs its own local/lightweight solution — generate once, cache as static assets. A cloud API stays an option later if local quality/latency becomes limiting.

## 10. Platform & UI

- **Platform:** Web-based, cross-platform, Mac-first primary environment.
- **UI principle:** Text is the default medium (squad lists, reports, inbox, dialogue), but not mandatory. Anything that communicates better without text — morale, financial health, match momentum, staff/player quality, relationships — should be visual (color, icons, simple charts, AI-generated imagery) from day one. Clean and colorful, not a terminal.
- **Matchday UI:** Text commentary feed alongside the 2D pitch visualization, both driven by the same event stream.

## 11. Proposed Technical Architecture

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | React + TypeScript | Fast to build text-heavy UI; large ecosystem for tables/forms |
| Pitch visualization | SVG first, Canvas if needed | SVG is quicker to build/debug for ~20 moving icons; migrate only if perf demands it |
| Stadium editor | 2D top-down/side-on layout tool (SVG or simple canvas grid), no 3D | Matches the pitch viz approach; keeps scope/rendering complexity low |
| Match engine | TypeScript, server-side | Keeps simulation, save-state, and LLM calls in one trusted place |
| Backend | Node.js + Fastify/Express | One language across the stack; low overhead for a solo dev |
| Database | PostgreSQL | Relational fit for leagues/clubs/players/save-games |
| LLM integration (text) | Local model via Ollama (e.g. Llama) from v1 | Builds on existing local-AI setup; no per-call cost, works offline |
| Image generation | Local diffusion model, generated once and cached as static assets | Icons/backgrounds don't need per-session regeneration |
| Deployment | Local dev first; Docker-compose for later self-hosting | No deployment overhead while solo; easy path to a VPS later |

## 12. Additional Feature Candidates (genre-inspired)

### 12.1 Good fit — candidates for the pillars above
- Team dynamics / clique visualization (reinforces Press & Morale)
- Squad-planning promises & consequences (ties Tactics into Morale)
- Opponent analysis / data hub (extends the match engine)
- Staff delegation (reinforces Staff Management)
- International partner/feeder clubs (fits Transfers & Scouting)
- Matchday commerce & simple stadium editor — promoted into Club Economy (Section 7)

### 12.2 Interesting, but backlog
- Deeper commercial simulation (dynamic demand curves, sponsorship tiers with activation clauses)

### 12.3 Explicitly out of scope
- Full stadium 3D editor, manager's personal/private life simulation, playable player-manager mode

## 13. Rollout Phases (indicative)

1. **Simulation core** — event-driven match engine, single division, text commentary only.
2. **Club management loop** — tactics, squad, transfers, finances, staff, youth around the Phase 1 engine.
3. **World & economy depth** — multiple divisions, promotion/relegation, league macro-economy, multi-season persistence.
4. **Visualization & dynamic content** — 2D matchday pitch visualization, LLM-driven press/scouting/dialogue with morale impact, AI-generated imagery.
5. **Backlog / future PRDs** — tactics-board use of the pitch viz, extended economic modeling, potential shipping/distribution plan.

## 14. Open Questions

- How many divisions and clubs per division for the v1 world?
- Save-game model: single ongoing save, or multiple manager careers in parallel?
- How much LLM-generated content should be cached/reused vs. generated fresh per event?
- Definition of "done" for the MLP per pillar?
