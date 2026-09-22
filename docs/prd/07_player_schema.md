# /docs/prd/07_player_schema.md

**Version:** 1.1
**Last Updated:** 2026-09-22
**Status:** Final

---

## Purpose

Vollständige TypeScript-Definition des Player-Objekts. Alle Felder, Typen, Default-Werte, Invarianten. Source of Truth für alle Module.

---

## Scope

- `/src/types/player.ts` (TypeScript Interfaces)
- Validierungsfunktionen (`/src/types/validation.ts`)
- Serialize/Sanitizer (`/src/persistence/sanitizer.ts`)

**Dependencies:** PRD 02 (Growth Engine), PRD 03 (Youth), PRD 04 (Scouting), PRD 08 (Savegame)

Task-ID: `F-TYP-1` (P0, vor F2.2). Reiner Schema-Task, zählt nicht in die 92 Features von PRD 10.

---

## Design-Grundsätze

1. **Versteckte Werte im selben Objekt:** `hidden.anlage`, `hidden.drive` existieren, werden aber beim Export entfernt.
2. **Alle dynamischen Werte wöchentlich aktualisiert:** Fitness, Form, Morale, Weekly Minutes.
3. **Zwei Skalen:** Skill-Attribute 0–199. `weak_foot` 0–100. `Anlage` ist ein eigener Multiplikator-Typ (0.85–1.50), nicht `Attributes`.
4. **Engine-Vertrag:** Die lebende Match-Engine spricht 0–100 und ein anderes Attribut-Set. Dieses Schema ist der Karriere-Vertrag. Der Wrapper mappt. F-TYP-1 ändert `server/src/engine/` nicht.
5. **`age` ist abgeleitet:** Gespeichertes `age` ist ein Cache. Beim Laden gilt `birth.date` gegen das Spieldatum. Weichen sie ab, wird `age` neu gesetzt und die Datei gilt erst nach dem Neuschreiben als gültig.

---

## Specification

### 07.1 TypeScript-Interfaces (VERBINDLICH)

```typescript
interface Player {
  // ── Identität ─────────────────────────────
  id: string;                    // "pl_" + genau 5 Ziffern, unique global
  name: PlayerName;
  birth: { date: string; place: string; region: string }; // date = ISO YYYY-MM-DD
  nationality: string;
  age: number;                   // Cache, abgeleitet aus birth.date

  // ── Vertragsstatus ─────────────────────────
  club_id: string | null;
  squad_status: "pro" | "u17" | "u19" | "loaned_out";
  position: PositionPrimary;
  flexibility: PositionFlexibility[];
  contract: Contract | null;     // null bei Jugendspielern unter 16
  market_value: number;          // wöchentlich neu berechnet, siehe PRD 05.1
  current_loan?: LoanRecord;

  // ── Sichtbare Werte ────────────────────────
  attributes: Attributes;

  // ── Versteckte Werte ───────────────────────
  hidden: {
    anlage: Anlage;              // Multiplikator pro Skill, Range 0.85–1.50
    drive: number;               // 0.4–1.6, mutabel
    maturity_offset: number;     // -5 bis +5 Jahre, Eingang in effective_age (PRD 02.1)
    breakout_flags: string[];    // bereits gefeuerte Breakout-IDs
  };

  // ── Dynamischer Zustand ────────────────────
  state: {
    fitness: number;             // 0–100
    injury: Injury | null;
    form: number;                // -5 bis +5 (MA über 5 Spiele)
    morale: number;              // 0–100
    weekly_minutes: number;
    season_minutes: number;
    modifiers: TemporaryModifier[];
  };

  // ── Geschichte & Analytics ──────────────────
  history: {
    growth: GrowthSnapshot[];    // eine Zeile pro Saisonende
    clubs: ClubHistoryEntry[];
    achievements: string[];
    milestones: MilestoneEvent[];
  };

  // ── Visualisierung ─────────────────────────
  portrait_seed: number;         // Seed für prozeduralen Sprite
}

type PositionPrimary =
  | "GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "AM" | "LM" | "RM" | "LW" | "RW" | "CF";

interface PositionFlexibility {
  trained_as: PositionPrimary;
  proficiency: number;           // 0.0–1.0
  weeks_trained: number;
}

/** Skill-Attribute 0–199. weak_foot ist 0–100 und kein Skill der 199er-Skala. */
interface Attributes {
  shooting: number; passing: number; dribbling: number; technique: number;
  pace: number; strength: number; stamina: number;
  composure: number; leadership: number; positioning: number; vision: number;
  concentration: number; teamwork: number;
  weak_foot: number;             // 0–100
  gk_handling: number;           // 0–199, nur relevant bei GK
}

/** Dieselben Schlüssel wie Attributes, andere Skala. Nicht Attributes zuweisen. */
type Anlage = Record<keyof Attributes, number>;

interface TemporaryModifier {
  source_event_id: string;
  attribute?: keyof Attributes;
  delta?: number;
  fitness_regen_multiplier?: number;
  until_week?: number;
  until_injury_end?: boolean;
}

interface Contract {
  wage_weekly: number;
  bonus_goal: number;
  bonus_appearance: number;
  until_season: number;
  buyout_clause?: number;
  sell_on_percentage?: number;
  guaranteed_minutes_promise?: "none" | "rotation" | "starter";
}

interface Injury {
  type_id: string;
  weeks_remaining: number;
  severity: "minor" | "moderate" | "severe";
  sustained_week: number;
}

interface GrowthSnapshot {
  season: number;
  age: number;
  attributes_snapshot: Attributes;
  minutes_played: number;
  drive_at_snapshot: number;      // NUR intern, wird beim Export entfernt
}

interface LoanRecord {
  from_club: string;
  to_club: string;
  until_season: number;
  has_option: boolean;
  option_fee?: number;
  minute_guarantee?: number;
}
```

Positionsgruppen für PRD 05.1:

| PositionPrimary | CA-Gruppe |
|---|---|
| GK | GK |
| CB | CB |
| LB, RB | FB |
| DM, CM | MF |
| AM | AM |
| LM, RM, LW, RW | W |
| CF | CF |

### 07.2 Default-Werte bei Generierung

| Feld | Default / Quelle |
|---|---|
| attributes.* (Skills) | Gaussian-Mixture (mean 65/85/105/120), Positionsgewichtung. Skala 0–199 |
| attributes.weak_foot | 20–80, unabhängig von der Mixture |
| hidden.anlage.* | uniform 0.85–1.50 pro Schlüssel |
| hidden.drive | triangular(0.6, 1.0, 1.5); bei Elite-Anlage (Skill-Mean > 95) 15 % Chance ×0.85 |
| hidden.maturity_offset | 0; +5 mit P(early)=3 %, −5 mit P(late)=8 % |
| state.fitness | 100 |
| state.form | 0 |
| state.morale | 70 |
| state.modifiers | leeres Array |
| history.growth | leeres Array, erster Snapshot nach Saison 1 |

Die Korrelation −0.15 aus PRD 03.1 ist eine leichte Gegenbewegung von Drive zu mittlerer Anlage, zusätzlich zur 15 %-Regel. Beide gelten bei der Generierung. Das Ergebnis wird auf [0.4, 1.6] geclamp.

### 07.3 Invarianten

| Invariante | Constraint |
|---|---|
| hidden.anlage.* ∈ [0.85, 1.50] | Wird nach Generierung nur durch Breakout-Events geschrieben |
| hidden.drive ∈ [0.4, 1.6] | Breakouts ändern drive in Sprüngen (PRD 06), Ergebnis immer geclamp |
| Skill-Attribute ∈ [0, 199] | Soft cap 180 (Wachstum ×0.3). 199 ist der gespeicherte Höchstwert |
| weak_foot ∈ [0, 100] | Eigene Skala |
| fitness, morale ∈ [0, 100], form ∈ [−5, +5] | |
| market_value | Deterministische Funktion (PRD 05.1), nie Random Walk. Bei `contract == null` ist der Vertragsterm 0 Monate |
| squad_status `"loaned_out"` ↔ `current_loan` | Beide gesetzt oder beide leer. Ein Loan ohne Status ist ungültig, ein Status ohne Loan ebenfalls |
| age | Entspricht den vollen Jahren zwischen `birth.date` und Spieldatum |

### 07.4 Validator-Funktionen

```typescript
// src/types/validation.ts
const SKILLS = [
  "shooting", "passing", "dribbling", "technique",
  "pace", "strength", "stamina",
  "composure", "leadership", "positioning", "vision",
  "concentration", "teamwork", "gk_handling",
] as const;

function validatePlayer(p: Player, asOfIso: string): boolean {
  if (!/^pl_\d{5}$/.test(p.id)) return false;

  for (const key of SKILLS) {
    const value = p.attributes[key];
    if (value < 0 || value > 199) return false;
    const anlage = p.hidden.anlage[key];
    if (anlage < 0.85 || anlage > 1.5) return false;
  }
  if (p.attributes.weak_foot < 0 || p.attributes.weak_foot > 100) return false;
  const weakAnlage = p.hidden.anlage.weak_foot;
  if (weakAnlage < 0.85 || weakAnlage > 1.5) return false;

  if (p.hidden.drive < 0.4 || p.hidden.drive > 1.6) return false;
  if (p.hidden.maturity_offset < -5 || p.hidden.maturity_offset > 5) return false;

  if (p.state.fitness < 0 || p.state.fitness > 100) return false;
  if (p.state.morale < 0 || p.state.morale > 100) return false;
  if (p.state.form < -5 || p.state.form > 5) return false;

  const loaned = p.squad_status === "loaned_out";
  const hasLoan = p.current_loan != null;
  if (loaned !== hasLoan) return false;

  for (const slot of p.flexibility) {
    if (slot.proficiency < 0 || slot.proficiency > 1) return false;
  }

  if (completedYears(p.birth.date, asOfIso) !== p.age) return false;
  return true;
}
```

`completedYears` zählt vollendete Jahre. Der Validator repariert nichts. Der Lade-Pfad setzt `age` neu und speichert danach.

## References

- Growth Engine: PRD 02.1
- Savegame Sanitizer: PRD 08.3
- UI Player Profile: PRD 09.2 (Screen 4)
- Market Value: PRD 05.1
