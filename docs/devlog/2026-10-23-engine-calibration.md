# Calibrating the match engine (and why the pitch had to go)

**Date:** 2026-10-23

The live matchday is now text-first (ADR 0004). That only works if the event stream reads like football, so we measured it for the first time.

---

## What we found

We built a harness (`npm run play-calibration`, `npm run calibrate:career`) and ran hundreds of seeded matches. A typical career fixture had **53 shots**, one striker took **73 %** of his team's shots, and **every other match had a hat-trick**. The cause was not shooting: the engine played about **500 through balls a match**, so possession flipped every 2–3 events. Failed build-up passes went straight to a lurking striker 20 units from goal, and carries ran through the back line unopposed.

## What we changed

- Passes are contests: passer against the defence's reading of the game, by kind and length. Build-up is safe, the final third is hard.
- A misplaced pass is a loose ball, not a gift. Carries stop at a defender in the way, and a beaten back line sprints goal-side.
- Teams pass forward, through balls are rare, and wide players get up the flank. Misplaced wide passes and cleared crosses go out for throw-ins and corners.
- Shots follow an xG shape: block first, then on target by distance, then shooter vs keeper.
- Both XIs are normalized to one skill level before kick-off. An amateur derby and an elite final play the same kind of football; the stronger side still wins.

## Where it stands

| per career match | before | now | real football |
|---|---|---|---|
| goals | 4.4 | 2.6 | ~2.8 |
| shots | 53 | 26 | ~25 |
| pass completion | 46 % | 72 % | 70–85 % |
| fouls / yellows | 8.7 / 0.7 | 22 / 3.3 | ~22 / ~4 |
| hat-trick matches | 45 % | 13 % | ~3 % |

**Tactics still matter:** on held-out seeds the ten best plans for Nordstern beat the ten worst by **1.3 goals per game** (25 % vs 1 % wins).

That is partly a problem. The worst plans are all 5-4-1, and formations with wide midfielders (4-4-2, 4-5-1, 5-4-1) attack far less than 4-3-3. This was already the case before (and was worse); it is the next calibration task, together with the forwards taking ~90 % of the shots.

---

## Deutsch (Kurz)

Erstmals gemessen: 53 Schüsse, Hattrick in jedem zweiten Spiel. Die Ursache war Ballbesitz-Ping-Pong durch ca. 500 Steilpässe pro Spiel. Nach der Kalibrierung: 2,6 Tore, 26 Schüsse, 72 % Passquote. Offen sind die Formations-Balance (4-3-3 zu stark, 4-4-2 zu schwach) und die Schuss-Konzentration auf die Stürmer.
