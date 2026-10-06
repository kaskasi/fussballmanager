# /docs/prd/03_youth_academy.md

**Version:** 1.3
**Last Updated:** 2026-10-06
**Status:** Final

---

## Purpose

Spezifikation der Jugendakademie: Intake-Generierung, automatische Simulation, Entscheidungs-Punkte. Jugendteams werden **nicht manuell verwaltet**.

---

## Scope

- Modul 3: Jugendakademie
- Intake-Generator (`/src/youth/intake_generator.ts`)
- Academy-Visualisierung (Campus-Grid, `/src/ui/screens/`)
- Youth-Simulation (`/src/youth/youth_sim.ts`)
- Satelliten-Camps (F3.9, `/src/youth/satellite-camps.ts`)

**Dependencies:** PRD 02 (Growth Engine), PRD 07 (Player-Schema), PRD 08 (Savegame), PRD 09 (UI Screens)

---

## Design-Grundsätze

1. **Vollautomatische Jugendteams:** Manager stellt niemals U17/U19 Aufstellungen.
2. **Jährlicher HQ-Intake:** 24 / 28 / 32 neue Spieler am Saisonende (U17, Alter 15), je Campus-Stufe.
3. **Gaussian Mixture Distribution:** Erlaubt normale Talente und seltene Elite-Ausnahmen (Yamal-Typ).
4. **Entscheidungs-Limitierung:** Max 4 offene Decision-Items gleichzeitig; weitere Kandidaten warten in einer Queue (1 Zustellung pro Spieltag), nichts wird verworfen.
5. **Abgangsrisiko real:** Spieler können abspringen.

---

## Specification

### 03.1 Intake-Generierung

**Jährliche Generierung** am Saisonende (Ende Mai). Verteilung folgt Gaussian Mixture Model:

```json
{
  "generation_config": {
    "per_year_count": "24 (Basis) / 28 (Leistung) / 32 (Elite)",
    "region_diversity": "national",
    "skill_distribution": {
      "method": "gaussian_mixture",
      "components": [
        { "weight": 0.85, "mean": 65, "stddev": 10 },
        { "weight": 0.12, "mean": 85, "stddev": 8 },
        { "weight": 0.025, "mean": 105, "stddev": 6 },
        { "weight": 0.005, "mean": 120, "stddev": 5 }
      ]
    },
    "drive_distribution": {
      "method": "triangular",
      "min": 0.6,
      "mode": 1.0,
      "max": 1.5,
      "correlation_to_anlage": -0.15
    },
    "maturity_variance": {
      "early_bloomer_prob": 0.03,
      "late_bloomer_prob": 0.08
    }
  }
}
```

Die Gewichte summieren sich auf 1.

**Anlage-Generierung pro Spieler:**

- Pro Attribut: uniform 0.85–1.50, unabhängig gesampelt.
- Leichte Variation (±0.10) um den positionsbasierten Mittelwert.
- Drive: triangular(0.6, 1.0, 1.5), plus Korrelation −0.15 zur mittleren Anlage.
- Anti-Korrelation bei Elite-Anlage (Skill-Mean > 95): 15 % Chance auf ×0.85.
- Ergebnis auf [0.4, 1.6] clampen (PRD 07.3).

**Maturity-Offset:**

- Standard: 0.
- Early Bloomer: +5 (wirkt wie fünf Jahre älter über `effective_age`, PRD 02.1). Wahrscheinlichkeit 3 %.
- Late Bloomer: −5. Wahrscheinlichkeit 8 %.
- Komponente 4 (Mean 120, Gewicht 0.005) setzt zusätzlich `hidden.breakout_flags` += `"prodigy_foundation"` (PRD 06.1). Das ist der Generational-Marker, kein Laufzeit-Event.

„Intake-Base +10 / +25“ aus 03.2 verschiebt jeden Mixture-Mean um diesen Betrag. Die Verschiebungen stapeln nicht: Elite ersetzt Performance, Performance ersetzt Basis.

### 03.2 Jugend-Campus (Grid + Stufen, F3.2 / F3.7)

Kein isometrisches Stadtmodell. Heimat ist der Report (PRD 14.4); der Campus-Tab
ist ein **Grid der drei Stufen** mit sichtbaren Effekten und Freischalt-Gates.

Gebäude-Levels nach `/data/infrastructure/stadium_upgrades.json`:

```json
{
  "academy_facilities": [
    {
      "id": "academy_basic",
      "name": "Jugendhaus (Basis)",
      "cost": 0,
      "effect": "24 Intake, Standard-Qualität",
      "icon": "🏠"
    },
    {
      "id": "academy_performance",
      "name": "Leistungszentrum",
      "cost": 2500000,
      "requires": "stadion_min_capacity_20000",
      "effect": "28 Intake, Means +10, Drive-Umfeld +0.15",
      "icon": "🏋️"
    },
    {
      "id": "academy_elite",
      "name": "Elite-Akademie",
      "cost": 8500000,
      "requires": "academy_performance",
      "effect": "32 Intake, Means +25, 1.5× Elite-Gewicht (mean 120), Mentoren-Level steigt",
      "icon": "⭐"
    }
  ]
}
```

1.5× gilt für das Gewicht 0.005, nicht für einen zusätzlichen Würfel. Die anderen Gewichte werden proportional herunterskaliert, damit die Summe 1 bleibt.

### 03.3 Simulation & Reports

Automatische Sim U17/U19. Nur Summary-Outputs:

```typescript
interface YouthReport {
  week: number;
  u17_results: { wins: number; draws: number; losses: number };
  u19_results: { wins: number; draws: number; losses: number };
  standout_players: Array<{
    player_id: string;
    rating_change: number;
    minutes_played: number;
    coach_comment_icon: "🚀" | "➡️" | "⚠️" | "😞";
  }>;
  promotion_recommendations: Array<{
    player_id: string;
    reason: "ready_for_first_team" | "needs_more_experience" | "contract_priority";
    urgency: "now" | "next_window" | "future";
  }>;
}
```

### 03.4 Manager-Entscheidungen (Decision Inbox)

Max **4 offene** Items gleichzeitig. Ein Abgangsrisiko (03.5) zählt wie jedes andere Item. Alle weiteren Kandidaten der Woche landen in einer **priorisierten Queue** und werden mit **1 Item pro Spieltag** in die Inbox übernommen — **kein Drop**, kein Overflow-Warning.

```typescript
interface YouthInboxState {
  week: number;
  items: DecisionInboxItem[];      // offen, max 4 pending
  queue: DecisionInboxItem[];      // wartend, priorisiert
  resolvedIds: string[];
}

interface YouthDecisions {
  loans: Array<{ player_id: string; destination_club: string; guarantee_minutes?: number }>;
  promotions: Array<{ player_id: string; probation_weeks: number }>;
  contract_offers: Array<{ player_id: string; term_years: number; wage_category: string }>;
  training_focus_override: { player_id: string; focus: "technical" | "physical" | "mental" };
}
```

Interaktionsregel: Drag-and-Drop eines Spieler-Badges auf Action-Icons.

| Aktion | Icon |
|---|---|
| Leihen | 🔄 |
| Hochziehen | ⬆️ |
| Vertrag | ✍️ |
| Trainingsfokus | 💪 |

Dieselben vier Icons gelten auf Screen 2b (PRD 09).

### 03.5 Abgangsrisiko

```json
{
  "departure_risks": {
    "trigger_factors": {
      "no_game_time_threshold": "weniger als 45 Minuten in 4 Wochen",
      "offer_from_better_club": "Rivale mit höherer Akademiestufe",
      "family_move": "random_event 0.5%/Woche",
      "lack_of_contract_offer": "kein Vertrag bis Alter 17"
    },
    "notification": "Manager sieht Warn-Icon (🚩) vor Abgang, hat 1 Woche Entscheidungsfenster",
    "counter_measures": {
      "guarantee_playing_time": "Auto-Sim muss die Mindestminuten einhalten, kostet Moral anderer",
      "loan_with_option": "hält Rechte, gibt Spielpraxis",
      "raise_wage": "kurzfristige Kostensteigerung"
    },
    "loss_consequence": "Spieler geht, Club erhält ggf. Ablöse oder gar nichts"
  }
}
```

Die Minuten-Garantie erfüllt die automatische Jugend-Sim, nicht eine manuelle Aufstellung.

### 03.6 Satelliten-Jugendcamps (F3.9)

Kein Scout-Karten-Ersatz (F4.4) und keine Blutlinie (C2). Jedes Camp ist ein
bezahlter Satellit der Zentrale.

- Katalog: sechs Nationen (nicht DE). Kaufpreis + wöchentlicher Unterhalt.
  Höchstens **3** Camps gleichzeitig, eine Nation nur einmal.
- **Camp-Leiter** wird über Agentur + Hub-Auswahl eingestellt (03.6.2), nicht per
  Sofort-Toggle. Bezahlter Wochenlohn nur bei `leader_hire === hired`. Die drei
  Profi-Gruppen-Trainer (F8.1) bleiben in der Zentrale.
- Saisonende: unstaffed 2 Spieler / staffed 4, Nationalität des Camps, schwächere
  Mischung ohne Betreuer. `state.youth_site = campId`.
- Camp-Kids stehen nicht in der HQ-Jahrgangstabelle, bis **Übernehmen in die
  Zentrale** (`youth_site = "hq"`). Keine Camp-XIs (Gesetz 6).

#### 03.6.1 Camp screen layout (P2, F3.9 UI)

Playtest-Slice: **6 Nationen** als **3×2-Kartenraster** (kein Split-Listen-Layout).

| Element | Verhalten |
|---|---|
| Karte | Landschaftsfoto (CC0/Lizenziert, `campPhotoUrl(nationId)`), Nation + Region |
| Status | Nicht gekauft (Preis + Kaufen) · gesperrt (Limit/Cash) · aktiv (Unterhalt/Wo) |
| Agentur | Brief-Icon (Lucide `Mail`) — beauftragt Kandidatensuche; erneuter Klick = gleicher Hinweis (NoticeToast) |
| Roster | Portrait, Name, Position, CA; **In Jugend überführen** auf owned Camps |
| Camp-Leiter | Nach Hub-Auswahl: Portrait + Name + Rolle (Klick entlässt); während Suche Brief-Icon; bei Kandidaten „Kandidaten im Hub“ |
| Kauf | Sofort **1–2** schwache Talente (niedrige CA, **max** `anlage` + `drive`) im Camp |
| Assets | Manifest `src/ui/assets/camp-photos.ts`; Bake `npm run bake:camp-photos` → `public/assets/photos/camps/` |

Keine Camp-Aufstellungen, keine Scout-Karte — Gesetz 6 unverändert.

#### 03.6.2 Camp-Leiter Einstellung

1. **Agentur:** Klick auf Brief-Icon setzt `leader_hire = agency_pending` und
   `agency_commissioned_at` (Saison/Woche/Wochentag). `staffed` bleibt `false`.
   UI-Hinweis: *„Eine Agentur wurde beauftragt, geeignete Kandidaten für die Camp-Leitung zu finden.“*
2. **Wartezeit:** **5 Werktage** (Mo–Fr; Sa/So zählen nicht) entlang des Tageskalenders.
   Danach `leader_hire = candidates_ready` + `candidate_set_id` (deterministische Dreierliste).
3. **Hub:** Sektion **Camp-Personal** (parallel zur Jugend-Inbox, **nicht** gegen MAX 4).
   Modal: 3 Kandidaten, Portrait, ~5 Sätze Intro; einige disqualifizieren sich im Text;
   Badges für `training_mod` / `mental_mod`. v1: `training_mod` skaliert Camp-Intake-`meanShift`;
   `mental_mod` gespeichert + Badge (Sim-Follow-up).
4. **Abschluss:** Auswahl → `leader_hire = hired`, `staffed = true`, Navigation Campus Tab Camps.
5. **Save:** Felder auf `YouthCamp` in Pipeline; Migration backfillt altes `staffed: true`.
6. **Out of scope v1:** Presse/Interview, Agenturkosten, zweiter Fortschritts-CTA.

### 03.7 Invarianten

| Regel | Überprüfung |
|---|---|
| HQ-Intake nur am Saisonende | Aufruf während der Saison wirft |
| Camp-Kids nicht in HQ-Tabelle | `youth_site !== "hq"` |
| Jugend-Simulation läuft vor der Entscheidungsinbox | Inbox ist der Folge-Step |
| Max 4 offene Decision-Items gleichzeitig | Pending-Clamp; Queue liefert 1/Tag |
| Keine verworfenen Kandidaten | Queue statt Overflow-Drop |
| Abgangsrisiko nur bei 16+ Jahren | Jüngere Spieler können nicht abspringen |

## References

- Growth Engine: PRD 02.1
- Player-Schema: PRD 07
- UI Screens: PRD 09.2 (Screen 2)
- Savegame: PRD 08.1
- Generational-Flag: PRD 06.1
