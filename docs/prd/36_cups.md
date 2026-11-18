# PRD 36 — Domestic cups

**Status:** In progress (slice 1/3) · 2026-11-18 · Phase 5 of PRD 30.
**Features:** F10.9 (PRD 10, new; F10.6 stays the international cup).
**Touches:** PRD 11 (cup money, slice 2), PRD 16 (shootout beats, slice 3),
PRD 23 (cup objectives, slice 3), PRD 32 (season archive), PRD 35 (cup weeks).

## 1. Problem

Every season has nine free cup weeks (PRD 35) and nothing is played in them.
A club's season is the league only; there is no giant-killing, no cup run.

## 2. Competitions

Names are invented and neutral (PRD 12 Out: no DFB marks).

| Cup | Entrants | Rounds |
|---|---|---|
| **Nordpokal** (regional) | Tiers 4–5: Regionalliga Nord + Oberliga Nord, 36 clubs | Preliminary round (the 8 lowest-reputation Oberliga clubs, 8 → 4), then a 32-club bracket: R32, R16, QF, SF, final |
| **Meisterpokal** (national) | Tiers 1–3 (54 clubs), last season's Nordpokal winner and runner-up, then the highest-reputation Regionalliga Nord clubs not yet in, up to 64 | R64, R32, R16, QF, SF, final |

Reputation (world clubs), not squad strength, picks the preliminary-round
clubs and the national fill: it does not depend on rosters, so the draw is the
same whether or not rosters were simulated. Season 1 has no previous Nordpokal,
so the national cup fills with ten Regionalliga clubs.

## 3. Calendar

Each round has its own week, so a club in both cups never plays twice in a
week, and cup weeks hold no league match (PRD 35). Weeks are resolved from the
schedule (pre-season slot n, cup slot n), not hard-coded.

| Week | Slot | Round |
|---|---|---|
| 4 | pre-season 2 | Nordpokal preliminary |
| 5 | pre-season 3 | Nordpokal R32 |
| 6 | pre-season 4 | Meisterpokal R64 |
| 12 | cup 1 | Meisterpokal R32 |
| 20 | cup 2 | Meisterpokal R16 |
| 30 | cup 3 | Nordpokal R16 |
| 33 | cup 4 | Meisterpokal QF |
| 36 | cup 5 | Nordpokal QF |
| 39 | cup 6 | Meisterpokal SF |
| 42 | cup 7 | Nordpokal SF |
| 45 | cup 8 | Nordpokal final |
| 48 | cup 9 | Meisterpokal final |

All 13 non-league slots that can hold a match are used except pre-season 1
(week 3, the career start week).

## 4. Rules

- Single leg. The lower-tier club is at home; same tier: the first drawn is
  at home. The final is on neutral ground (no home edge).
- The draw for round n+1 happens right after round n, from `master_seed`,
  season, cup and round. Same seed, same results → same draws.
- Draw after 90 minutes: a seeded penalty shootout (five each, then sudden
  death). Extra time in the national cup needs an engine or wrapper change and
  comes in slice 3 if approved (PRD 30 open question).
- Ties use the quick strength model (`teamStrength`, the same model as the
  promotion playoffs). The manager's club uses its own career squad.

## 5. Data

`pipeline.cups`: the current season only.

```ts
interface CupTie { home: TeamId; away: TeamId; neutral?: boolean;
  result?: { homeGoals: number; awayGoals: number; penalties?: [number, number]; winner: TeamId } }
interface CupRound { round: number; key: CupRoundKey; week: number; ties: CupTie[] }
interface CupCompetition { id: "regional" | "national"; entrants: TeamId[];
  rounds: CupRound[]; winner: TeamId | null; runnerUp: TeamId | null }
interface CupSeason { season: number; cups: CupCompetition[] }
```

Rounds are added as they are drawn. At season end the archive entry gets
`cups: [{ id, winner, runnerUp, ties: [round, home, away, homeGoals, awayGoals, winner, penHome?, penAway?][] }]`
(ids and numbers only, about 100 ties a season), and next season's cups are
created from the new pools and this season's Nordpokal finalists.

A save without `pipeline.cups` (pre-107) gets the current season's cups on
load; rounds whose week has passed are played at once, with squad strength
for every club (the manager's own squad is not used for that catch-up).
SAVE_VERSION 107.

## 6. Slices

1. Cup state, entrants, draw, quick-sim rounds for every tie (the manager's
   too, with a club-event line), archive results, next season's entrants.
2. The manager's ties through the match flow (lineup, press, live match,
   report), penalty shootout with commentary beats, prize and TV money per
   round (PRD 11), gate split, per-competition discipline (PRD 34 keys:
   `"regional"`, `"national"`), "simulate until next event" stops at the
   manager's cup weeks.
3. UI: bracket or rounds view on the Leagues screen (wireframe first),
   fixtures in the calendar, hub snippet, competition in the match header;
   giant-killing story and press beats; cup board objectives; extra time if
   approved.

## 7. Acceptance

- Every season both cups finish with exactly one winner.
- No club has two fixtures in one week (cups and league together).
- The Nordpokal winner and runner-up are in next season's Meisterpokal.
- Same seed → same draws and winners.
- The long run passes.

## 8. Progress

—
