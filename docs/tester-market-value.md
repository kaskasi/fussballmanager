# Tester-Hinweis: Marktwert (PRD 05.1)

Der gespeicherte **`market_value`** wird beim **Laden** des Saves und **jede Woche** nach der Simulation neu berechnet (aktuelle PRD-05.1-Formel).

## Formel (kurz)

`Basis(CA) × Reife(Alter) × Entwicklung(<21) × Vertrag × Nachfrage × Ruf`

- **Entwicklung** kann bei Jugendlichen **> 100 %** sein (Upside), nicht mehr der frühere Malus (15 J. × 0,15).
- **26-Wochen-Momentum** (`recent_growth_26w`) erhöht den Jugend-Upside — im Profil sichtbar.
- **Deckel:** unter 21 Jahren maximal **8 Mio €** ohne Awards.

## Sanity-Check

| Spieler | Erwartung |
|---------|-----------|
| CA 99, 15 J., U17, normales Wachstum | deutlich **über** ~600k; typisch **4–5 Mio €** |
| CA 99, 25 J., Profi | ~**3–4 Mio €** (Peak, wenig Upside) |
| 15 J. CA 99 | Marktwert **≥** 25 J. CA 99 (gleiche Skills) |

Aufschlüsselung: Spielerprofil (Overview) und Verkaufsdialog.
