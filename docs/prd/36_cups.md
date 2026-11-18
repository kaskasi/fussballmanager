# PRD 36 — Domestic cups

**Status:** In progress (slice 2/3 built) · 2026-11-18 · Phase 5 of PRD 30.
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
- The manager's tie is played on the Saturday of its week through the normal
  match flow (lineup, live match, report). A level score goes to a kick-by-kick
  shootout at wrapper level (`src/competitions/cup-shootout.ts`): the starters
  take the kicks in order, goalkeeper last, from the match seed, so the report
  and the week sim show the same shootout. Quick-simmed ties use totals only.
- Cup minutes count for fitness and growth (weekly minutes), not for league
  season stats (apps, goals, cards). Cards go to the cup's discipline key
  (`"regional"`, `"national"`, PRD 34); a league ban does not block a cup
  match and the other way round. AI cup bans come only from the manager's
  watched tie; every club that plays a tie serves one cup ban match.
- Prize money per round won (`cupPrizeForWin`, finance line `cup_prize`,
  also into the transfer pool like the league prize): Nordpokal 5k–120k €,
  Meisterpokal 120k–2.5 M €.
- A home cup tie is a home matchday for gate, concessions and merch; the final
  is neutral and pays no gate.

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
2. The manager's ties through the match flow (lineup, live match, report),
   penalty shootout shown kick by kick in the report, prize money per round
   (PRD 11), per-competition discipline (PRD 34 keys: `"regional"`,
   `"national"`), "simulate until next event" stops at the manager's cup
   weeks. Changed from the plan: no gate split (the home side keeps the gate;
   the finance step only knows "home matchday or not", a split needs gate
   accounting first) and no press conference around cup ties (pressers are
   keyed by league matchday); both move to slice 3. Shootout commentary in
   the live stream also moves to slice 3 (the report shows the kicks).
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

Slice 1 built (SAVE_VERSION 107): `src/competitions/` (definition, tie,
season), cups created for new careers, at season end and on load of older
saves; the manager's ties are quick-simmed with the career squad's strength
and reported as club-event lines. Tests: entrants (36 / 64), one round per
week outside league weeks, one winner per cup, no club twice in a week,
lower tier at home, determinism, finalists qualify, catch-up on load.
10-season long run (seed 2026): all invariants hold, including the new cup
checks (both winners, Nordpokal finalists in the next Meisterpokal);
season sim 28.7–29.8 s from season 2 (was 28.5–30.9 s); save 1,618 KB gz at
season 10 (was 1,608), `pipeline.cups` 1 KB, archive 21 KB.

Slice 2 built (no save change): cup match setup and Saturday stop in the Next
flow, watched result replaces the quick sim, kick-by-kick shootout, cup
minutes and per-cup discipline for own and AI players, home gate, prize
money, eligibility per competition through lineup, auto-lineup, bench,
opponent preview and report, "until the next event" stops at the manager's
cup weeks, match header names cup and round. `cup-lookup.ts` holds the
read-only lookups so calendar and navigation modules avoid import cycles.
Tests: setup and Next stop, full week sim with a watched 1:1 won on
penalties (result, cup ban not league ban, prize line, club event), league
ban vs cup eligibility, next-event stop, shootout rules. 10-season long run:
all invariants hold; season sim 29.0–33.4 s (run alongside the test suite),
save 1,617 KB at season 10. Not seen in a browser: the cup lineup label, the
shootout panel and the per-cup bench (a dev save edited to a cup week did
not load). Next: slice 3.
