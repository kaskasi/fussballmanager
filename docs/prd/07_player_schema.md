# /docs/prd/07_player_schema.md

**Version:** 1.5
**Last Updated:** 2026-10-10
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
    contract_weights?: ContractWeights; // F5.4 Berater-Prioritäten (Export entfernt)
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
    contract_failed_offers?: number; // F5.4, consecutive rejects
    desire_to_leave?: boolean;       // F5.4 after 3 fails
    contract_talks_locked_until_day?: number; // F5.4, calendar day index
    contract_wage_cut_allowed?: boolean;      // F5.4 story-only wage cuts
    contract_underpaid_since_day?: number;    // F5.4 underpaid arc start
    contract_renegotiation_prompts?: number;  // 3 / 9 / 12 months mailed
    contract_demoralized?: boolean;           // F5.4 permanent after 12mo arc
    scoring_streak?: number;                 // F2.8 Chancentod
    last_match_goals?: number;               // F2.8 hat-trick clear
    youth_site?: "hq" | string;              // F3.9; missing = "hq"
  };

  // ── Geschichte & Analytics ──────────────────
  history: {
    growth: GrowthSnapshot[];    // eine Zeile pro Saisonende
    clubs: ClubHistoryEntry[];
    achievements: string[];
    milestones: MilestoneEvent[];
    /** Pre-F2.8 flavor labels only (veteran wallpaper). Not mechanical. */
    career_stamps?: string[];
  };

  // ── F2.8 Fähigkeiten / Bonus-Stamps ────────
  /** Earned named bonuses. Effects are baked into `attributes` on award. */
  stamps: AbilityStamp[];

  // ── Visualisierung ─────────────────────────
  /** Seed für Open-Peeps-Bust (Abbildung über Pool `mens_squad` in der UI — kein Gender-Feld in v1). */
  portrait_seed: number;
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
  weekly_growth_multiplier?: number;   // PRD 06 Tier-2
  attribute_group?: "technical" | "physical";
  form_shock?: boolean;
  until_week?: number;
  until_injury_end?: boolean;
}

/** F2.8 — named bonus identity. See 07.5. */
type StampPath = "train" | "event" | "hybrid";

interface AbilityStamp {
  id: string;                    // catalog id, e.g. "kopfballungeheuer"
  earned_season: number;
  earned_week: number;
  path: StampPath;
  /** Deltas already applied to `attributes` when the stamp was awarded. */
  applied: Partial<Record<keyof Attributes, number>>;
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

### 07.6 Verletzungen (F1.4 v1, leicht)

- **Risiko:** `injuryRiskScore` (Fitness, Minuten, Trainingsintensität, Müdigkeit, Physio-Faktor) — bereits in UI.
- **Roll:** Nach Ligaspiel-Woche, nur **eigener Profikader**, `weekly_minutes > 0`, nicht bereits verletzt. Score &lt; 40 → keine Chance; ab ~90 spürbar (~12 % Cap/Woche). Deterministisch: `hash(master_seed, season, week, player_id)`.
- **Outcome:** `Injury` mit `type_id` (Text-Labels), `severity`, `weeks_remaining` (minor 1–2, moderate 2–4, severe 4–7), `sustained_week`.
- **Heilung:** Zu Wochenbeginn `weeks_remaining -= 1`, bei 0 `injury = null`. Während Verletzung kein Fitness-Update, kein Einsatz (Aufstellung/Auto-XI).
- **Diagnose-Queue (F8.2 M2-Slice):** Wenn `medical_center` am Gelände platziert (Stufe ≥ 1), landet ein frischer Roll zuerst in `state.medical.pending_diagnoses[]` (`player_id`, `type_id`, `severity`, `days_remaining`, `sustained_week`, `sustained_career_day`). Tick **pro Karriere-Tag** (Training-NEXT / Kalender). Stufe 1: **3 Tage** Diagnose; Stufe ≥ 2 (Imaging): **1 Tag**. Erst danach wird `player.state.injury` gesetzt; `weeks_remaining` × **Reha-Multiplikator** (Medical-Staff + Stufe 3 OP). Ohne Medical-Gebäude: sofortiges `injury` wie bisher.
- **Wartezimmer (M2+):** Symptom-Text sichtbar, Diagnose verborgen bis **Arzt untersucht** (Button). OP schwerer Fälle: in-house nur Medical Stufe 3 + Orthopäde, sonst externe OP (Wochenverzögerung). **Physio-Kapazität/Wo:** Stufe 1 → 2 Auto, Stufe 2 → 4, Stufe 3 → 6; Rest **Mithelfen** (Körper-Wireframe-Modal).
- **Reha-Tiefe:** F2.6 volle Stufen-Sim bleibt M3; M2-Slice = Modifier + leichtes Praxis-Minigame (max. 1 Bonus/Spieler/Woche).
- **Engine:** Match-Engine unverändert; keine Sync-Pflicht zu Engine-`injury`-Events in v1.

### 07.7 Positionsumschulung (F2.3 v1)

- **Programm:** Individual-Training `position_retrain`, Dauer-Slider **4–12 Wochen** (`MIN_PROGRAM_WEEKS` / `MAX_PROGRAM_WEEKS`).
- **Ablauf:** Wochen 1…N−1 binden den Slot ohne `flexibility`-Fortschritt. **Abschluss-Check in der letzten Programmwoche** (analog Stempel-Vergabe).
- **Erfolgs-Chance** `p` (clamp 0,05–0,95):
  - **Mental:** Mittelwert aus `composure`, `concentration`, `teamwork` ÷ (3 × 199).
  - **Positions-Nähe:** Grobe Lane `TW | IV | MF | ST` (PRD 14.3); gleiche Lane = 1,0; benachbart = 0,75; überspringend = 0,5; TW↔Feld = 0,35.
  - **Dauer:** Faktor `min(1, plannedWeeks / 8)` — ab **8 Wochen** keine höhere Chance (nur Opportunity Cost).
  - **Stärke in der Ziel-Linie** (wie Profil „Stärke als…“): `laneSkill` 0–1 — Primärposition in derselben Lane wie Ziel = 1,0; sonst max. `flexibility.proficiency` in dieser Lane.
  - **Ziel-Slot:** bestehende Proficiency auf exakt `target` (+0,08 × headStart im Basis-Term).
  - Formel: `base = 0,12 + 0,71 × laneSkill + 0,08 × targetProficiency`; `p = clamp(0,05…0,95, base × duration × (0,70 + 0,30 × mental) × lane)`.
  - Beispiel: AM → CM bei voller MF-Linie, 8 Wochen, starke Mental-Werte → ~83 %.
- **RNG:** `hash(master_seed, player_id, target, season, startedWeek)` → Unit-Test `[0,1)`.
- **Erfolg:** Slot `trained_as = target`, `proficiency = 1,0`, `weeks_trained += plannedWeeks`.
- **Misserfolg:** Partieller Zuwachs `proficiency += plannedWeeks × 0,025 × mental` (cap &lt; 1); `state.retrain_failures[target] += 1`.
- **Erschöpfung:** Bei **2** fehlgeschlagenen Abschlüssen für dieselbe Zielposition Option ausblenden; UI-Hinweis: „Das hatten wir doch schon versucht …“
- **Save:** `player.state.retrain_failures?: Partial<Record<PositionPrimary, number>>` (0–2).

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
| stamps | leeres Array |
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
| stamps | Jede `id` höchstens einmal. `applied` Werte ∈ [−4, −1] ∪ [+1, +4] pro Schlüssel. Max 3 aktive Anzeige-Slots in der UI (alle earned stamps bleiben im Array) |
| stamps vs attributes | Beim Award werden `applied` einmalig auf `attributes` addiert (Clamp 0–199). Kein zweites Match-Modifier-System in M2 |

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

  const stampIds = new Set<string>();
  for (const stamp of p.stamps ?? []) {
    if (stampIds.has(stamp.id)) return false;
    stampIds.add(stamp.id);
    if (stamp.path !== "train" && stamp.path !== "event" && stamp.path !== "hybrid") return false;
    for (const delta of Object.values(stamp.applied)) {
      if (delta === 0 || Math.abs(delta) > 4) return false;
    }
  }
  return true;
}
```

`completedYears` zählt vollendete Jahre. Der Validator repariert nichts. Der Lade-Pfad setzt `age` neu und speichert danach.

### 07.5 Fähigkeiten / Bonus-Stamps (F2.8)

Named bonuses the player **wears** on the Akte. Roleplay identity + a small
permanent attribute bump. Not a weekly loadout. Not hidden potential.

#### Paths (M2)

| Path | How earned | Example |
|---|---|---|
| `train` | Attribute gate + individual program (shares F2.3 slot cap) | *Kopfballungeheuer*, *Krieger* |
| `event` | Season/career counter, or spawn-at-generation phase curse | *Treter*, *Grünschnabel* |
| `hybrid` | Gate / career proof **unlocks** eligibility; F2.3 stamp program **seals** and bakes `applied` | *Anführer*, *Künstler*, *Taschenmesser* |

Unlocked-but-unsealed hybrids show as a dashed Fähigkeiten-Slot on the Akte
(click-to-train), not as a finished badge. `evaluateEventStamps` does not
auto-award `hybrid`.

#### Effect (M2)

On award, apply `applied` once to `attributes` (2–3 keys, each **−4…−1 or
+1…+4**, then clamp 0–199). Soft Cap 180 still governs later weekly growth
(PRD 02.1). No separate match-engine modifier layer — the bump is the effect.
Engine stays hands-off; the wrapper sees normal attributes.

Phase stamps (`spawn` in the catalog) can **clear**. Clearing **unbakes**
`applied` (subtract the stored deltas, clamp 0–199) and removes the stamp
from `stamps[]`. Not a weekly loadout.

#### Caps

- Max **3** stamps shown as active badges on the Akte (PRD 14.3). Further
  earned stamps stay in `stamps[]` and appear in chronicle / development tab.
- One program slot: stamp training uses the same `MAX_INDIVIDUAL_PROGRAMS`
  budget as F2.3 (`kind: "stamp"` + `stampId`).
- A player may hold each catalog `id` only once.

#### Catalog

There is no separate `heading` attribute — aerial gates use `strength` +
`positioning`.

| id | Label | Path | Gate / spawn | Weeks | applied |
|---|---|---|---|---|---|
| `gruenschnabel` | Grünschnabel | event | spawn 98% of new gens; clear at 40 career apps | — | composure −2, leadership −1 |
| `chancentod` | Chancentod | event | spawn 15% of AM/LW/RW/CF; clear hat-trick or 5-app scoring streak | — | shooting −2, composure −1 |
| `kopfballungeheuer` | Kopfballungeheuer | train | strength ≥ 100 ∧ positioning ≥ 90 | 10 | strength +3, positioning +2, pace −1 |
| `geolter_blitz` | Geölter Blitz | train | pace ≥ 100 ∧ stamina ≥ 85 | 8 | pace +3, stamina +2, technique −1 |
| `spielmacher_blick` | Spielmacher-Blick | train | vision ≥ 100 ∧ passing ≥ 95 | 10 | vision +3, passing +2, strength −1 |
| `torjaeger_saison` | Torjäger | event | season_goals ≥ 25 (same season) | — | shooting +3, composure +2, teamwork −1 |
| `alter_recke` | Alter Recke | event | career apps ≥ 300 | — | leadership +3, concentration +2, pace −1 |
| `treter` | Treter | event | season_yellow_cards ≥ 13 | — | strength +2, composure +2, passing −1 |
| `anfuehrer` | Anführer | hybrid | career apps ≥ 80 ∧ leadership ≥ 90 | 10 | leadership +3, composure +2, pace −1 |
| `kuenstler` | Künstler | hybrid | dribbling ≥ 100 ∧ technique ≥ 95 | 10 | dribbling +3, technique +2, teamwork −1 |
| `krieger` | Krieger | train | strength ≥ 100 ∧ concentration ≥ 85 | 8 | strength +3, positioning +2, passing −1 |
| `motor` | Motor | train | stamina ≥ 100 ∧ teamwork ≥ 90 | 8 | stamina +3, teamwork +2, shooting −1 |
| `taschenmesser` | Taschenmesser | hybrid | 2 trained flexibility lanes | 10 | positioning +3, teamwork +2, shooting −1 |
| `sweeper_keeper` | Sweeper-Keeper | train | GK ∧ gk_handling ≥ 100 ∧ positioning ≥ 90 | 10 | gk_handling +3, passing +2, strength −1 |

Spend-bar: progress ring on empty Fähigkeiten slots while a train/hybrid
stamp program runs; click an eligible empty slot to start it. Hybrid slots
use a dashed outline until sealed. Catalog JSON lives under
`data/development/ability_stamps.json`.

There is no stored `experience` attribute and no Erfahrung-stamp. Derive a
match factor from Pro-Jahre (seasons with appearances) + `careerApps`
(history + current season). Soft cap at Alter Recke’s 300 Einsätze — not a
potential ceiling (Gesetz 1). Akte fact: „Erfahrung · Roh“ while
*Grünschnabel* is on, else a short bar from apps. The career→engine wrapper
scales **positioning / tackling / aerial** only
(`shared/src/career-squad-bridge.ts`). Engine folder stays hands-off
(Gesetz 4). Stacks with Grünschnabel (already baked into attributes).

False 9 / Raumdeuter / Box-to-Box stay later (need match-event counters).
C2 remains blocked (PRD 15).

#### Relation to flavor

`history.career_stamps` (veteran wallpaper strings) is **not** mechanical.
Show real `stamps` in the Fähigkeiten slots once F2.8 UI lands; flavor
strings may remain as chronicle crumbs.

## References

- Growth Engine: PRD 02.1
- Individual programmes: PRD 10 F2.3 / F2.8
- Savegame Sanitizer: PRD 08.3
- UI Player Profile: PRD 09.2 (Screen 4), PRD 14.3
- Market Value: PRD 05.1
- Vertragsverhandlung: PRD 05.4 (`contract_failed_offers`, `desire_to_leave`,
  `contract_underpaid_since_day`, `contract_renegotiation_prompts`, `contract_demoralized`)
- Former candidate C1: PRD 15 (promoted)
