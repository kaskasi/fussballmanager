# /docs/prd/02_growth_engine.md

**Version:** 1.4
**Last Updated:** 2026-10-10
**Status:** Final

---

## Purpose

Definieren der mathematischen Growth-Engine, die wöchentlichen Attribut-Zuwächse berechnet. Keine festen Potentials, sondern Alterskurven × Anlagen × Drive × Umwelt.

---

## Scope

- Modul 2: Training & Entwicklung
- Growth-Engine-Implementierung (`/src/development/growth_engine.ts`)
- Alterskurven (`/data/rules/growth_curves.json`)

**Dependencies:** PRD 07 (Player-Schema), PRD 10 (Feature-Liste, Training-Module)

---

## Design-Grundsätze

1. **Kein festes Potential:** Wachstum folgt der Formel ohne Potential-Feld. Soft Cap bei 180, gespeicherter Höchstwert 199.
2. **Versteckte Werte:** `hidden.anlage` (pro Attribut) und `hidden.drive` sind bei der Generierung gesetzt. `drive` ändert sich durch Breakouts (PRD 06), nicht durch einen wöchentlichen Mentoring-Trickle.
3. **Varianz erwünscht:** Gaussian-Noise pro Attribut pro Woche. Freddy-Adu- und CR7-Verläufe müssen möglich sein.
4. **Wöchentlicher Update:** Growth wird wöchentlich berechnet, nicht pro Saison.

---

## Specification

### 02.1 Growth-Formel

Pro Skill-Attribut `attr` (alle `Attributes`-Schlüssel außer `weak_foot`):

```text
effective_age = clamp(age + maturity_offset, 14, 45)

growth(attr) =
    learning_base(effective_age)     // 0.07 Punkte × ageDevelopmentFactor
  × anlage(attr)                     // 0.85–1.50
  × drive                            // 0.4–1.6
  × environment()                    // M1: immer 1.0
  × N(1, σ)                          // PRD 02.3, multiplikativ
  × training_focus(attr)             // PRD 02.4
  × match_practice(minutes)          // PRD 02.5
  × breakout_growth_multiplier       // PRD 06 Tier-2, Produkt aus state.modifiers, Clamp 0.4–2.5
  − decay_per_week(attr, effective_age)
```

`breakout_growth_multiplier` wird **nach** Drive/Alter/Umfeld und **vor** Noise angewendet (Implementierung: `growthMultiplier` in der Pipeline-Woche).

`learning_base` ist `0.07 × ageDevelopmentFactor`. Die Namen `bell`,
`early_peak`, `late_peak`, `plateau`, `continuous_growth` in 02.2 sind Labels.
Sie sind kein zweiter Multiplikator. Der numerische Alterseffekt ist
`ageDevelopmentFactor` plus der subtraktive Decay.

`environment()` kommt aus Trainerstab (F8.1) und Gelände-Training (`precinctTrainingEnvironment`). Mentoring ist kein Wochenfaktor. Minuten und Fokus-Slots werden nicht doppelt in `environment()` gezählt.

`weak_foot` wächst mit derselben Formel, σ der technischen Attribute, Decay der Gruppe `all_other`. `gk_handling` zählt als physisches Attribut für σ und als `all_other` für Decay.

**ageDevelopmentFactor** (`effective_age`):

```text
age < 15        → 1.1
15 <= age <= 20 → 2.4   // starker Lernspurt
20 < age <= 25  → 1.45  // normal
25 < age <= 27  → 1.0
27 < age <= 32  → 0.65
age > 32        → 0.28
```

Intake startet mit 15 (PRD 03). Ab ~25 flacht Entwicklung ab; ab 33 kaum noch positives Lernen ohne Decay.

**Constraints:**

- `growth(attr)` wird am Ende auf [−3.0, +5.0] geclamp.
- Verletzung: `training_focus()` = 0 und `match_practice()` = 0.3. Die 0.7-Untergrenze aus 02.5 gilt nur für gesunde Spieler ohne Einsatz.
- Soft Cap: liegt der gespeicherte Wert bei 180 oder darüber, wird das positive Wachstum ×0.3 gerechnet, bevor der Clamp auf [−3, +5] und der Höchstwert 199 angewandt werden. Negatives Wachstum (Decay) bleibt unverändert.

### 02.2 Alterskurven (`/data/rules/growth_curves.json`)

`decline_start` ist der erste effektive Geburtstag, ab dem der Jahres-Decay läuft. Pro Woche wird `per_year / 52` abgezogen.

```json
{
  "age_curves": {
    "technical_attributes": {
      "shooting": { "peak": 28, "decline_start": 32, "curve": "bell" },
      "passing":  { "peak": 27, "decline_start": 32, "curve": "bell" },
      "dribbling":{ "peak": 25, "decline_start": 32, "curve": "bell" },
      "technique":{ "peak": 26, "decline_start": 32, "curve": "bell" }
    },
    "physical_attributes": {
      "pace":     { "peak": 23, "decline_start": 25, "curve": "early_peak" },
      "strength": { "peak": 29, "decline_start": 30, "curve": "late_peak" },
      "stamina":  { "peak": 26, "decline_start": 27, "curve": "bell" }
    },
    "mental_attributes": {
      "composure":    { "peak": 30, "decline_start": 32, "curve": "plateau" },
      "leadership":   { "peak": 32, "decline_start": null, "curve": "continuous_growth" },
      "positioning":  { "peak": 29, "decline_start": 32, "curve": "bell" },
      "vision":       { "peak": 27, "decline_start": 32, "curve": "bell" },
      "concentration":{ "peak": 28, "decline_start": 32, "curve": "bell" },
      "teamwork":     { "peak": 30, "decline_start": 32, "curve": "plateau" }
    }
  },
  "learning_base_by_age": {
    "points_per_week": 0.06,
    "formula": "age_factor = (15 <= age <= 23 ? 1.5 : 1.0) * (age > 27 ? 0.7 : 1.0) * (age > 32 ? 0.4 : 1.0)"
  },
  "decay_rates": {
    "pace":      { "per_year_from_decline_start": -1.5 },
    "stamina":   { "per_year_from_decline_start": -1.2 },
    "strength":  { "per_year_from_decline_start": -0.8 },
    "all_other": { "per_year_from_decline_start": -0.3 }
  },
  "attribute_bounds": {
    "min": 0,
    "soft_cap": 180,
    "hard_cap": 199
  }
}
```

Leadership hat `decline_start: null` und keinen Jahres-Decay.

Entscheidung zur vorherigen Doppelzahl: Pace 25, Stamina 27, Strength 30, alle übrigen Skills 32. Ältere Kurven-Labels (Stamina 28, Strength 31, einzelne Technik-Werte vor 32) hatten keinen eigenen Wochenwert und gelten nicht mehr.

Technische und mentale Attribute außer den drei Physis-Werten nutzen `all_other` und damit `decline_start` 32 aus der Kurve. Pace, Stamina und Strength nutzen ihren eigenen `decline_start`.

### 02.3 Varianz-Parameter

| Attributstyp | σ (Gaussian Noise) |
|---|---|
| Technisch (shooting, passing, dribbling, technique, weak_foot) | 0.15 |
| Physisch (pace, strength, stamina, gk_handling) | 0.20 |
| Mental (composure, leadership, positioning, vision, concentration, teamwork) | 0.10 |

Implementation: `N(1.0, σ)` multiplikativ auf den Wachstumsteil vor dem Decay, nicht additiv. Liegt die Ziehung unter 0, wird sie wie 0 behandelt, damit Rauschen das Vorzeichen nicht allein umkehrt.

### 02.4 Training-Fokus-Bonus

Die Woche hat **15 Trainingsslots** (3 Einheiten pro Werktag, Mo–Fr). Davon dürfen **bis zu 2 Fokus-Slots** sein (F2.1).

- Pro Attributgruppe höchstens 2 Fokus-Slots.
- Pro Fokus-Slot auf der Gruppe: `training_focus(attr) = 1 + 0.33` (ein Fokus) bzw. `1 + 0.66` (zwei Fokus auf derselben Gruppe) für jedes Attribut der Gruppe.
- Kein Fokus auf der Gruppe: 1.0.
- Session-Typen treffen Gruppen: technical → shooting, passing, dribbling, technique, weak_foot.

Die Heatmap der Wochenzuwächse ist Screen 1 in PRD 09. Sie hat keine eigene Formel. Sie zeichnet das Ergebnis von 02.1.

F2.8 Bonus-Stamps (PRD 07.5) sind **kein** Wochen-Wachstumsfaktor. Sie vergeben
einmalig feste Attribut-Bumps und laufen über Individualprogramm-Slots (F2.3),
nicht über Fokus-Slots. Sie ändern `training_focus()` nicht.

### 02.5 Match-Practice-Bonus

```typescript
function calculateMatchPractice(minutes: number, injured: boolean, playingTimeFactor = 1): number {
  if (injured) return 0.3;
  if (minutes === 0) return 0.7 * playingTimeFactor;
  return (1.0 + (minutes / 90) * 0.15) * playingTimeFactor;
}

// Profis: `playingTimeFactor` skaliert 0.55→1.0 wenn season_apps / matchdays < 0.35 (ab 4 Spieltagen).
// Der Trainingsanteil wird zusätzlich mit `TRAINING_POWER` 1.25 multipliziert. Decay bleibt unverändert.
// U17/U19 nutzen den Faktor nicht — wenig Einsatz → eher zurück in die Jugend.
```

### 02.6 Decay-Regeln

- Decay startet bei `effective_age >= decline_start` des Attributs.
- Decay ist subtraktiv: `per_year / 52` pro Woche.
- Leadership hat keinen Decay.
- Mentoring ist kein Wachstumsfaktor in dieser Datei. Der einmalige Drive-Sprung steht in PRD 06.2 (`mentor_ignition`, +0.25).

### 02.7 Invarianten (Test-Cases)

Annahmen der Tests: `environment = 1`, Noise = 1, kein Fokus, `maturity_offset = 0`, Attribut ist `passing` außer im Pace-Fall. `passing` hat vor 32 keinen Decay.

| Testfall | Erwartetes Ergebnis |
|---|---|
| Spieler age 19, attribute 100, anlage 1.2, drive 1.4, 90 Min | growth ≈ 0.07 × 2.4 × 1.2 × 1.4 × 1.15 |
| Spieler age 30, attribute 140, anlage 1.0, drive 0.8, 0 Min | growth ≈ 0.07 × 0.65 × 1.0 × 0.8 × 0.7 |
| Spieler age 25, attribute 180, anlage 1.1, drive 1.2, 45 Min | positives Wachstum × 0.3 (soft cap), danach Clamp |
| Spieler age 33, pace 130, anlage 1.0, drive 1.0, 0 Min, gesund | Wachstumsteil klein, Decay 1.5/52, Netto negativ — Tempo sinkt |

### 02.8 Balance-Korridore

Diese Korridore sind Regression-Gates, keine Potentialgrenzen:

- Gesunder Profi (19–20) mit Einsatz und Plan: CA-Zuwachs über 52 Wochen typisch
  etwa 10–20 Punkte unter guten Bedingungen (Trainer, Gelände, Fokus, Minuten).
- U17-Spieler (`developmentScale ≈ 0.88`) mit Talent und Einsatz: über 30 Wochen
  oft 4–14 CA — deutlich langsamer als im Profi mit Volleinsatz, aber spürbar.
- Ein gesunder 33-Jähriger ohne Einsatz verliert über 52 Wochen mindestens
  0.5 Pace-Punkte.
- Ein Spieler darf durch eine normale Saison niemals von Intake-Niveau zum
  Weltstar springen.
- Elite-Verläufe entstehen aus hoher Anlage, hohem Drive, Fokus, Spielpraxis
  und seltenen Breakouts gemeinsam — nicht aus der Basisrate allein.

## References

- Player-Schema: PRD 07
- Breakout-Events: PRD 06
- Youth-Simulation: PRD 03.3
- UI-Heatmap: PRD 09.2 (Screen 1), Daten aus 02.1
