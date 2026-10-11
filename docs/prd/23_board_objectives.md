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

## Projektziel

Jede Saison genau **ein** optionales Projektziel (deterministisch aus Seed): Jugendcamp besetzen, Stadionausbau, Arztzentrum, Fanshop-Umsatz +25 %.

Baselines (`season_baselines`: Ø-CA, Merch-Netto) werden beim Saisonstart gespeichert.

## Entlassung (F9.1)

- **Entlassung nur**, wenn ein **Pflichtziel** (`mandatory: true`) am Saisonende verfehlt ist — typischerweise das sportliche Tabellenziel.
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
