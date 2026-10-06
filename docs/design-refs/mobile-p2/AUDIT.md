# Mobile layout audit (P2, ~390px)

Reference viewport: **390×844** (iPhone-class). Add PNG screenshots here when captured (`hub.png`, `squad.png`, `calendar.png`, `camps.png`, `training-retrain.png`).

## Checklist (2026-10-06)

| Screen | Issue | Fix |
|--------|--------|-----|
| Shell header | Identity + cash + NEXT overflow; vertical misalignment / inset mismatch | `game-surfaces.css` `.app-nav.club-shell-header` shared inset + flex center; mobile @480px grid areas |
| Hub | Three-column grid | Existing stack @1024; columns `min-width: 0` |
| Squad / youth tables | Horizontal bleed | `.pro-squad-table-wrap` / `.youth-squad-table-wrap` scroll |
| Calendar | Grid squeeze | `.calendar-grid-wrap` horizontal scroll, min grid width |
| Youth camps | 3×2 too tight | `game-surfaces.css` 2-col @720px, 1-col @480px |
| Training retrain | Meter overflow | Full-width meter @480px |

## DoD

- No horizontal **page** scroll at 390px on hub, squad, calendar, camps tabs.
- Primary header CTAs ≥44px touch target.
