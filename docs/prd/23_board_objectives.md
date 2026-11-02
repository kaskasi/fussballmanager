# 23 — Vorstand & Saisonziele (F9.1)

## Tier aus Tabellenplatz

Zu Saisonstart (und bei Job-Wechsel) leitet das System den **Club-Standing-Tier** aus dem aktuellen Ligaplatz des Arbeitgebers ab (`club-standing-tier.ts`):

| Tier | Typische Lage | Pflicht (sportlich) |
|------|---------------|---------------------|
| `survival_low` | Abstiegsnähe | Klassenerhalt (Platz ≤ 15) |
| `survival_mid` | unteres Mittelfeld | Klassenerhalt |
| `upper_half` | obere Hälfte | Platz ≤ 9, Ø-CA +2, positives Torverhältnis |
| `ambition` | Spitze / Favorit | Platz ≤ 3–4 (club-spezifisch) |

Nebenziele: Liquidität (Gehalts-Wochen), Cash-Puffer (nicht Pflicht), Ø-CA, Punkte — je nach Tier.

**Pyramide (PRD 32 §8):** Wer aufsteigt, startet die neue Saison mit `survival_mid` („Klasse halten“); wer absteigt, mit `ambition` („direkter Wiederaufstieg“); wer bleibt, behält den Tier aus dem Tabellenplatz. Ein Club außerhalb der eigenen Tabelle (Jobangebot aus einer anderen Liga) wird nach seinem Ruf-Rang in seiner Spielklasse eingestuft. Nach einer starken Saison (Top 4 nach mindestens 10 Spieltagen) kommen zwei der drei Jobangebote von den schwächsten Clubs der Liga darüber.

## Projektziel

Jede Saison genau **ein** optionales Projektziel (deterministisch aus Seed): Jugendcamp besetzen, Stadionausbau, Arztzentrum, Fanshop-Umsatz +25 %.

Baselines (`season_baselines`: Ø-CA, Merch-Netto) werden beim Saisonstart gespeichert.

## Druck während der Saison (seit 2026-10-21)

Vorher änderte sich `board.pressure` nur am Saisonende und durch Story-Entscheidungen — im Playtest
blieb er bei Platz 16 auf 0 %, und `press_hostile_bad_week` (braucht ≥ 40) konnte nie feuern.

Jetzt nach jedem Spieltag (`updateInSeasonPressure`, `src/board/season-objectives.ts`, aufgerufen in
`week-pipeline.ts`):

- **Ergebnis-Ziel** = 12 × Plätze unter dem Pflicht-Platzziel + 3 × Punkte hinter dem Punkte-Soll
  (Punkteziel × gespielte / alle Spieltage), max. 100.
- Druck steigt Richtung Ergebnis-Ziel um höchstens **12 pro Spieltag** (35 % der Lücke).
- Nur wenn der Club **im Soll** ist (Platz und Punkte), sinkt der Druck um 4 pro Spieltag — Story-Druck bleibt sonst erhalten.
- **Mahnbrief** (einmal pro Saison) ab **70 %** → Club-Event `board.pressure.warning`.
- **Entlassung in der Saison**: nach dem Mahnbrief, ab **95 %** und frühestens nach **8 Spieltagen**
  → `job_status: "dismissed"`, Club-Event `board.pressure.dismissed`; das bestehende Jobangebots-Modal öffnet sich.
- Am letzten Spieltag (Saisonende) entscheidet weiter `evaluateSeasonObjectives`.

Grob: Platz 16 bei Ziel 15 mit ~10 Punkten Rückstand aufs Soll → Druck ~50 %, kein Rauswurf.
Letzter Platz mit 20+ Punkten Rückstand → Mahnbrief und Entlassung im Winter.

## Entlassung (F9.1)

- **Entlassung zum Saisonende**, wenn ein **Pflichtziel** (`mandatory: true`) am Saisonende verfehlt ist — typischerweise das sportliche Tabellenziel. In der Saison siehe oben.
- Verfehlte **Nebenziele** (Cash, Runway, Projekt): Druck + ggf. kleine Cash-Strafe, **kein** automatisches Job-Ende allein deswegen.
- Volle Zielerfüllung: Vorstands-Bonus (Cash).

## Jobangebote

Vorschau zeigt das **mandatory** Saisonziel des Zielvereins, berechnet mit demselben Generator wie im laufenden Spiel (`generateSeasonObjectives` + Liga-Kontext).

## Manager-Wechsel (Economy)

- Beim Annehmen eines neuen Jobs: **kein** Mitnehmen des Kassenstands des alten Vereins.
- Finanzen = Baseline des neuen Clubs + **Signing Bonus** aus dem Angebot.
- Emotionaler Ausgleich: Story-Postfach **Begleiter** — wähle **1 von 9** Profis des alten Clubs (`manager_companion_pick`).

## Club-Pipeline bei Wechsel

`resetClubPipelineForTeam`: Stadium, Scouting, Medical, Transfers, Youth-Cohort, Camps etc. werden auf den **neuen** Arbeitgeber zurückgesetzt; Profikader kommt aus der Ligawelt. Siehe `club-pipeline-reset.ts`.
