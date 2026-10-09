# Playtest balance pass — 2026-10-09

Jan live notes → code knobs (no save migration unless noted).

| Area | Change | Where |
|------|--------|--------|
| Opponent scout duration | 4 → **2** working days | `OPPONENT_SCOUT_WORKING_DAYS` |
| Parallel scout | Only assigned scout busy; 2+ scouts → trip + opponent | `scout-busy.ts`, test `opponent-scout-parallel.test.ts` |
| Profile stats tabs | Hide empty archive years (no `history.growth` row) | `listCareerStatSeasons` |
| Starting cash | €4.5M → **€5.5M**, transfer top-up €2.2M | `STARTING_CLUB_CASH` |
| Career calendar | New save **10.8.** (KW 33), Spieltag 1 **24.8.** — 2 prep weeks | `CAREER_START_WEEK` = −1, `calendarWeek` ohne Clamp |
| Camp opening | **2–3** youths, **mean shift 0** (same CA band as HQ academy ~60–120) | `CAMP_OPENING_MEAN_SHIFT` |

Constants re-export: `src/scouting/scout-job-timing.ts`.
