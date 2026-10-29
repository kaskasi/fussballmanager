# The Club

A single-player football management game about running an underdog club, not just picking a lineup.

You take a small, locally rooted club with a thin squad, a tight budget, and a real chance of relegation. The season is simulated. You decide who to trust, what to train, what to spend, and which story the club tells about itself. Matches are followed as a text broadcast: live commentary plus momentum, zone, and stat visuals derived from the same event stream. There is no 3D, and there is no multiplayer.

Play the current build: [fussi.imgarten.party](https://fussi.imgarten.party)

The interface is in German,Chinese and English.

## The week

Each week is one pass through the club:

1. Read the post. Board pressure, youth decisions, scouting, and the local paper land in one inbox.
2. Set the week. Training is a Monday–Friday timetable. Youth matches are simulated for you. You do not pick U17 or U19 lineups.
3. Run the club. Squad, contracts, scouting, stadium, medical, merch, and finances are separate rooms, not one spreadsheet.
4. Advance. Header **NEXT** is the only way the week moves. Match weeks become a broadcast. The result writes back into the table, the cash book, and the story.

Growth is absolute, not a star rating. Players do not have a hidden potential cap you can look up. Form, age, and variance decide how far someone actually goes. Relegation is real.

## What is in the build

The playable loop already includes:

- A manager desk that combines the inbox, today's training, the board, and the league
- Squad, mentoring, and staff
- A weekly training plan and individual extra work
- Youth campus and satellite camps
- Scouting: regions, staff, jobs, a talent pool, and a watchlist
- Transfers, contracts, and market value
- Stadium and construction, with a club-wide build queue
- Finances, matchday commerce, and merchandising
- Medical and rehab
- A text-first live match with event-derived momentum, zones, and stats (the 2D pitch is on the lineup screen)
- Local saves, plus an optional cloud save behind a sync code

It is pre-release. Balance, copy, and mobile layout are still moving. The numbered docs under [`docs/prd/`](docs/prd/) are the source of truth for what belongs in the game. If a feature is not in those docs, it is not a feature.

## How it is built

The match and the week run **in the browser**. Production hosting is a static app. There is no gameplay server, and there is no shared league.

```text
React UI  →  client simulation  →  match engine wrapper
                ↓
         local save  +  optional cloud blob
```

| Piece | Role |
| --- | --- |
| `src/ui` | Screens, shell, and presentation |
| `src/sim`, `src/development`, `src/economy`, `src/youth`, `src/scouting`, `src/transfers` | The club, week by week |
| `server/src/engine` | Match engine. Treated as a stable core and wrapped, not edited in product work |
| `shared` | Types and code that must not import the app |
| `worker` | Static hosting and a health check |

Stack: React 19, TypeScript, Vite, Vitest. Optional local API is Node and Fastify. Optional cloud save is a Supabase blob behind an edge function. Product analytics are optional and do nothing when unset.

Design rules live in [`docs/prd/design.md`](docs/prd/design.md): design tokens, one yellow progress button in the header, and icons instead of emoji.

## Run it locally

```bash
npm install
npm run dev
```

The app opens on Vite's default port. Useful checks:

```bash
npm run typecheck
npm run test:client
npm test
```

Copy [`.env.example`](.env.example) to `.env.local` only if you want Postgres, cloud save, Sentry, or PostHog. Without those variables the game still runs and saves locally.

Cloud save setup, if you want it, is in [`docs/ops-cloud-save-m1.md`](docs/ops-cloud-save-m1.md). The sync-code pepper belongs in the host's secret store, never in the repo.

## What this game refuses

Stated on purpose, not left for later:

- No 3D, including the stadium
- No multiplayer and no shared league
- No loans, debt markets, or outside investors in v1
- No scouting number that reveals a player's hidden ceiling
- Youth teams are reports and decisions, not a second match you play

## Credits

Portraits, textures, and icons shipped with the game come from declared open or CC0 sources and are remapped to the game's palette. Reference screenshots of other football managers are local design research and are not part of this repository.

## Status

Solo, in active development, pre-release. Saves load the current version only. A public issue list is not the way to request features. The PRD is.

Code in this repository is licensed under the MIT License. Third-party art keeps its own licenses.
