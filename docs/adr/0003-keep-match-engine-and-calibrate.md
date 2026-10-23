# ADR 0003 — Match-Engine behalten und kalibrieren (Gesetz 4 neu)

- Status: angenommen
- Datum: 2026-10-23

## Kontext

Seit 2026-09-28 war `server/src/engine/` eingefroren (Gesetz 4). Deshalb landeten alle Glaubwürdigkeits-Fixes in der Präsentation: synthetische Flug-Frames, GK↔CB-Kompression und das Umschreiben der Ball-Y bei Fehlschüssen (`docs/match-presentation-blockers.md`). Die Event-Statistik selbst wurde nie gemessen.

Eine Messung über 72 KI-Partien der echten Karriere-Welt (`newGameSession` → `matchdayFixtures` → `squadForLeagueClub` → `simulate`) ergab:

| pro Spiel | Engine | Zielband |
|---|---|---|
| Tore | 4,5 (max 21) | 2,4–3,6 |
| Schüsse | 53 | 20–30 |
| Anteil des Top-Schützen an den Team-Schüssen | 71 % | ≤ 45 % |
| Spiele mit Hattrick | 50 % | ≤ 6 % |
| Passquote | 51 % | 65–82 % |
| Fouls / Karten | 9,7 / 1,1 | 16–26 / 2,5–5 |
| Ecken | 10,8 | 8–12 |

Das Sandbox-Duell `SEED_MATCHUP` kommt auf 12,4 Tore und 88 Schüsse. Skaliert man beide Kader von ×0,5 auf ×1,1, steigen die Tore von 7,8 auf 14,1. Die Engine ist also nicht skalen-invariant, und das trifft spätestens die Elite-Welt (PRD 21).

Mögliche Ersatz-Engines (Stand Oktober 2026):

| Engine | Warum nicht |
|---|---|
| footballSimulationEngine (JS, MIT/ISC) | `Math.random()` ohne Seed. Das bricht Gegner-Scouting-Sims, Golden-Tests und die Checkpoints für Live-Wechsel (PRD 27). Keine Formation, Mentalität oder Pressing. Der TS-Fork `footballsim` ist winzig. |
| open-football (Rust, Apache-2.0) | Simuliert eine ganze Welt und wird als Binary samt eigener Web-App ausgeliefert, nicht als Bibliothek. Bräuchte WASM oder einen Sidecar. |
| Openfoot Manager (Rust, GPL-3.0) | GPL ist mit unserer MIT-Lizenz unvereinbar. |
| openengine (Java), Bygfoot (C, GPL-2.0) | Prototyp bzw. GPL und aggregiert. |

Alles hinter der Engine liest unseren typisierten `MatchEvent`-Strom: Director, Statistik, Bericht, Noten, Ligawoche, Scouting-Sims und Live-Wechsel. Ein Adapter für eine fremde Engine wäre selbst fast eine Engine.

### Baseline (Harness, 2026-10-23, vor jeder Änderung)

`npm run play-calibration -- --seeds=8` und `npm run calibrate:career`:

| pro Spiel | Sandbox | Division | Oberliga | Elite ×1,3 | Karriere |
|---|---|---|---|---|---|
| Tore | 12,8 | 11,0 | 9,8 | 12,3 | 4,4 |
| Schüsse | 95 | 86 | 95 | 85 | 53 |
| aufs Tor | 43 | 35 | 32 | 41 | 15 |
| Top-Schützen-Anteil | 80 % | 74 % | 75 % | 73 % | 73 % |
| Hattrick-Quote | 100 % | 87 % | 84 % | 88 % | 45 % |
| Passquote | 65 % | 63 % | 59 % | 71 % | 51 % |
| Fouls / Gelb | 6,9 / 0,9 | 7,3 / 0,6 | 7,8 / 0,6 | 6,1 / 0,6 | 8,7 / 0,7 |
| Ecken | 22 | 18 | 20 | 18 | 11 |
| Remis | 0 % | 6 % | 10 % | 7 % | 21 % |

## Entscheidung

1. **Die Engine bleibt.** Ihre Architektur (reines `step()`, Seed-RNG, fortsetzbar, Invarianten-Tests) ist solide. Das Problem ist die Kalibrierung.
2. **Gesetz 4 lautet neu:** Die Engine ist die einzige Quelle für Spielfakten, und die Präsentation darf Events nie umschreiben. Änderungen an `server/src/engine/` sind erlaubt, wenn sie
   - über den Kalibrier-Harness (`npm run play-calibration`) gemessen sind und die Tabelle vorher/nachher in der Commit-Nachricht steht,
   - die Band-Tests (`football-feel.test.ts`) grün halten,
   - Goldens im selben Commit bewusst aktualisieren.
3. **Zielbänder** stehen in `server/src/engine/calibration-bands.ts` und gelten für die Sets Sandbox, Division, Elite (×1,3) und Karriere.
4. Taktik muss weiter greifen: In `npm run study:opponent-scout:quick` liegen bester und schlechtester Plan mindestens 0,3 Tordifferenz pro Spiel auseinander.

## Alternativen

- **Engine ersetzen:** siehe Tabelle oben. Verworfen.
- **Engine eingefroren lassen:** Die Präsentation könnte die Event-Statistik nur verstecken. Im Text-Modus (ADR 0004) wären 53 Schüsse und Dreierpacks in jedem zweiten Spiel direkt lesbar. Verworfen.
- **Engine neu schreiben:** viele Wochen Arbeit ohne Garantie, dass das Ergebnis besser wird als eine Kalibrierung. Verworfen.

## Konsequenzen

- Goldens (`server/src/engine/golden/seed-2026.json`, Beat-Golden in `server/src/commentary/beats.test.ts`) und einzelne Ergebnis-Tests ändern sich mit der Kalibrierung.
- Die Artefakte in `docs/research` (Gegner-Scouting-Studie, Karriere-Playtest) werden neu erzeugt.
- `docs/match-presentation-blockers.md` ist überholt.
