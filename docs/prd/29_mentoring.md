# PRD 29 — Mentoring (F2.4)

**Status:** Umgesetzt · 2026-10-29 · ersetzt die offene Stelle in PRD 06.2 („noch nicht als eigene Formel spezifiziert“).

## 1. Produktentscheidungen

- **Mentor:** Profi im eigenen Kader mit mindestens **5 Profi-Jahren** (`careerProYears`, Saisons mit mindestens einem Einsatz, inkl. generierter Vorgeschichte). Kein Alters- oder Drive-Gate mehr. Wer selbst einen Mentor hat, kann keiner sein.
- **Talent:** Profi bis 23 Jahre.
- **Ein Talent pro Mentor.** Ein Paar belegt einen Platz.
- **Effekte pro Woche:** Moral, Form und Attribute. Attribute steigen **nur dort, wo der Mentor besser ist**, und nie über den Wert des Mentors.
- **Durchbruch:** Nach 26 Wochen mit einem Mentor mit Drive ≥ 1.3 setzt F2.4 das Signal für `mentor_ignition` (PRD 06.2), unverändert.

## 2. Wocheneffekt (`applyMentorshipWeek`)

Mentor-Qualität `q` = 0.4 + 0.6 × (0.75 × Führung + 0.25 × Erfahrung), Führung normiert (40 → 0, 90 → 1), Erfahrung bis 12 Profi-Jahre.

| Effekt | Wert pro Woche | Grenze |
|---|---|---|
| Moral | +0.6 × q | bis 80 (darüber kein Effekt) |
| Form (−4…4) | +0.08 × q | bis +1 |
| Attribute | Budget 0.25 × q Punkte, verteilt auf die bis zu 4 größten Vorsprünge (≥ 3), Gewicht `min(1, Vorsprung / 15)`, × Anlage | höchstens Mentor-Wert |

Torwart-Handling lernen nur Torhüter von Torhütern. Der Zuwachs läuft als eigener Schritt (`advanceMentorshipWeek`) nach der Growth-Formel (PRD 02), nicht in `environment()`. Ein Top-Mentor gibt so rund 8–12 Attributpunkte pro Saison weiter (je nach Anlage).

## 3. Plätze (`mentoring-capacity.ts`)

| Quelle | Plätze |
|---|---|
| Basis | 2 |
| Vereinsgebäude (gebaut, angebunden) Stufe 1 / 2 | +1 / +2 (Gemeinschaftsraum, zusammen zocken) |
| Restaurant (gebaut, angebunden) | +1 (gemeinsames Essen) |
| Obergrenze | 5 |

Fällt ein Platz weg, laufen bestehende Paare weiter; neue Paare gibt es erst, wenn wieder ein Platz frei ist (wie ADR 0002).

## 4. Screen

Kader → Mentoring, Layout wie Training → Individuell (design.md §9.11). Slot-Karten: belegt, frei, gesperrt mit Freischalt-Hinweis.

## 5. Speicherstand

`MentorshipState.gained` (weitergegebene Attributpunkte). `SAVE_VERSION` 100, `migration_100_mentoring_slots` löst Paare mit Mentoren unter 5 Profi-Jahren und doppelt belegte Mentoren auf.
