# PRD 34 — Suspensions

**Status:** Built · 2026-11-10 · Phase 3 of PRD 30. UI rest open (§5).
**Features:** F1.10 (PRD 10, new). **Touches:** PRD 07 (state fields).
PRD 33 is the engine-library PRD (open PR), so this phase takes 34.

## 1. Problem

The engine shows cards and yellows are counted, but nobody is ever banned and
red cards are not stored on the player. Eligibility only checks injuries.

## 2. Rules

| Trigger | Ban |
|---|---|
| Every fifth yellow in a competition | 1 match in that competition |
| Second yellow (yellow-red) | 1 match |
| Straight red | 2 matches (flat; the engine has no severity tag) |

- Bans and yellow tallies are per competition. Only `"league"` exists today;
  cup ids arrive with PRD 30 phase 5.
- The yellows of a yellow-red match do not count towards the five-yellow
  tally. A yellow before a straight red in the same match does count, and if
  it is the fifth, both bans add up (3 matches).
- A ban counts down when the club plays a match in that competition, not per
  calendar week.
- Season end: yellow tallies go back to zero, open bans carry over.
- AI players in the manager's division follow the same rules. Quick-sim
  divisions have no player stats and issue no bans; an open ban of a club
  that moves there still counts down with its matchdays.

## 3. Design

- Rules live in `src/discipline/suspensions.ts` (pure functions, no I/O).
- Player state (both optional, no backfill needed):
  `season_red_cards?: number` and
  `discipline?: Record<CompetitionId, { yellows: number; ban_matches: number; reason?: "yellows" | "second_yellow" | "red" }>`.
- Sent-off reason without a shared-contract change: a one-match stat row is
  unambiguous. `redCards > 0 && yellowCards >= 2` is a second yellow, any
  other `redCards > 0` is a straight red (`aggregatePlayerMatchStats` counts
  both yellows of a yellow-red). PRD 30 proposed a new field on
  `PlayerSeasonStat`; this derivation gives the same answer and keeps
  season rows clean.
- Apply after every match: own players in `src/sim/career-match-sync.ts`,
  AI in `src/sim/rival-matchday-stats.ts`. Order per player: serve one ban
  match first, then book this match's cards.
- Eligibility: `isPlayerMatchEligible(player, competition = "league")` now
  also rejects suspended players. That covers `career-engine-squad.ts`,
  `auto-lineup.ts` and `lineup-board.ts`. AI squads filter in
  `squadWithRivalRoster`, unless that would leave fewer than 11 players.
- No engine edit, so ADR 0003 calibration does not apply and golden tests
  stay unchanged.
- SAVE_VERSION 105; the migration only bumps the version.

## 4. UI

- Squad table: "Suspended · n" state instead of fitness, and a warning mark
  at four yellows (one more means a ban).
- Player profile: a suspended tile with reason and remaining matches.
- After the match: a club-event line for every new ban and for every player
  who reaches four yellows. The yellow-card emoji line in
  `src/match/post-match-events.ts` becomes plain text.
- Suspended players drop out of the lineup pool and the auto-lineup.

## 5. Open (not in this pass)

- Suspended badge on lineup cards and the status strip (today the player
  simply is not offered).
- Match-report line and the opponent analysis listing the other side's bans.

## 6. Acceptance

- Unit tests for thresholds, yellow-red, straight red, carry-over and
  per-competition tallies.
- AI squads never field a banned player; auto-lineup skips banned players.
- Engine golden tests unchanged.
