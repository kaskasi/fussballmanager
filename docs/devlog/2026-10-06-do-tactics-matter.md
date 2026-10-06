# Do tactics matter? (We hoped not — and were wrong in a good way)

**Date:** 2026-10-06

I built *The Club* around an underdog who is supposed to struggle. Nordstern starts with a squad that is **8–15 CA below the league median**. Relegation is allowed. Growth, youth, and transfers are the long game — not “win the league from day one.”

So I had a quiet hypothesis: **tactics are mostly theatre.** Pick a shape, slide a few bars, watch the engine do what player quality already decided. If that were true, Gegner-Analyse would still be useful for flavour — but not for real choices.

We ran an offline study to find out. The answer surprised me: **tactics matter more than I expected** — not enough to turn a weak squad into favourites, but enough that the right setup can **scrape draws and narrow wins** instead of walking into bad nights.

---

## What we did (plain setup)

- **Club:** FC Nordstern, **three fixture types** picked from the league by **starter Ø CA**: a **weaker**, **similar** (closest match), and **stronger** opponent (synthetic home fixtures; same XI each run).
- **Same XI every run** — only tactics change.
- **375 tactic “cells”:** 3 formations × stepped **mentality / pressing / line height** (duties from formation defaults). Same grid as PRD 22’s offline lattice.
- **20 deterministic match sims per cell** through our existing wrapper (`buildMatchView`) — **we did not touch** `server/src/engine/`.
- **Master seed 2026** so anyone can reproduce.

Roughly **22,500+** full matches wall-clock (~30–45 minutes on a desktop). Re-run: `npm run study:opponent-scout` (quick: `npm run study:opponent-scout:quick`).

Full tables and machine-readable output:

- [Summary markdown](../research/opponent-scout-nordstern-strength-sweep.md) (after a full run)
- [JSON](../research/opponent-scout-nordstern-strength-sweep.json)
- [CSV (top plans per fixture)](../research/opponent-scout-nordstern-strength-sweep.csv)

Legacy MD1–3 calendar sweep: `docs/research/opponent-scout-nordstern-md1-3.md`.

---

## What we saw

**Low-scoring football.** Even the “good” plans average around **one goal per side** or less. This fits the underdog tone — you are not simulating prime Barcelona.

**You still lose more than you win** on these three openers — but the spread between plans is real:

- Best cells on MD1 landed around **35–45% wins** (on 20 runs each — noisy, but the goal-diff story is steadier).
- On the **same squad**, good vs bad plans moved **average goal difference** by roughly **0.3–0.5 goals per game** in the bands we published.
- **No single magic preset** across all three opponents. High line (**L72**) and mid–high pressing showed up in a lot of winners for Nordstern early season — but MD3 punished careless aggression.

**Takeaway for design:** Tactics are **marginal gains and damage control** for a weak team. They do **not** erase a big CA gap. They **do** give managers something honest to optimise while the academy and market catch up.

---

## What ships in the game

**Gegner-Analyse** still runs **10 sims** at job end (current plan + your three saved presets). That is enough for score bands, the 4×3 grid, and 2–3 tactic rows in the Postfach — without asking players to wait half an hour.

The **375-plan lattice stays offline research** — but it validated that those 10 sims sit on top of a system where choices actually bite.

In-game **Help → Tactics** now explains the sliders, presets, scout bundle, and this underdog framing (canonical copy in `docs/help/tactics-player-guide.en.md`).

---

## What we did *not* prove yet

We have **not** run the same lattice for **two evenly matched teams**. My bet: when CA is close, the **same tactical edge tips more games** — “regularly” in the sense of meaningful win/draw swings, not win-every-week chess. Nordstern-only numbers are intentionally humbling.

---

## Deutsch (Kurz)

Wir dachten, Taktik sei bei Nordstern fast egal — **stimmt nicht ganz**. Gleiche Elf, 375 Pläne, 20 Läufe pro Plan: gute Einstellungen holen **Punkte und engere Spiele**, machen aber keinen Favoriten aus dem Underdog. Im Spiel: **Gegner-Analyse mit 10 Sims**; die große Studie liegt unter `docs/research/`.

---

*Copy for itch.io: use everything above the “Deutsch (Kurz)” block, or the full post including DE — paste below the `---` in the itch devlog editor.*

---
