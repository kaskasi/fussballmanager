# /docs/prd/04_scouting.md

**Version:** 1.2
**Last Updated:** 2026-10-06
**Status:** Final

---

## Purpose

Scouting-System spezifizieren, das **Unsicherheit schätzt statt Werte zu leaken**. Bayes-Modell reduziert Konfidenzintervalle durch Beobachtungen, aber nie exakte Zahlen. Ausnahme: eigene Spieler (04.6).

---

## Scope

- Modul 4: Scouting
- Wissensmodell (`/src/scouting/estimate_model.ts`)
- Scout-Network (`/src/scouting/scout_network.ts`)
- Scouting-Events (`/src/scouting/events.ts`)

**Dependencies:** PRD 07 (Player-Schema), PRD 08 (Savegame), PRD 09 (UI Screens)

---

## Design-Grundsätze

1. **Unsicherheits-Management:** Scouting fremder Spieler liefert CI-Bänder, keine festen Schätzwerte.
2. **Kein Editor-Mode nötig:** Absolute Werte bleiben versteckt, werden aber durch Geduld enger.
3. **Scout-Spezialisierung:** Nicht alle Scouts sind gleich gut. Regionale und fachliche Unterschiede.
4. **False Positives möglich:** Elite-Anlage plus niedriger Drive täuscht den ersten Report.

---

## Specification

### 04.1 Wissensmodell (Bayes-Update)

```json
{
  "estimation_method": "bayesian_interval",
  "default_prior": {
    "unknown_player": {
      "estimated_ability_mean": 65,
      "uncertainty_range": 40,
      "sample_size": 0
    }
  },
  "observation_update_rule": {
    "live_match_view": { "reduces_uncertainty_by": 15, "samples": 1 },
    "scout_visit_report": { "reduces_uncertainty_by": 8, "samples": 1 },
    "map_club_visit": { "multiplies_uncertainty_by": 0.667, "floor": 5, "samples": 1 },
    "video_review": { "reduces_uncertainty_by": 5, "samples": 1 },
    "trial_period": { "reduces_uncertainty_by": 25, "samples": 3 }
  },
  "time_decay": {
    "per_week_without_observation": 0.25,
    "ceiling": 40
  },
  "confidence_display_logic": {
    "range_width_40_plus": "❓ Unbekannt",
    "range_20_to_40": "🤷 Unklar",
    "range_10_to_20": "👁️ Grobes Bild",
    "range_under_10": "✅ Gut bekannt",
    "under_5": "🎯 Präzise Einschätzung"
  }
}
```

Ohne neue Beobachtung steigt `uncertainty_range` um 0.25 pro Woche, nie über 40. Beobachtungen senken sie, nie unter 0.

### 04.2 Scout-Tiers & Netzwerke

Vertrauen ist eine absolute Zahl 0–100, keine Sterne-Skala für Spielerqualität.

```json
{
  "scout_tiers": [
    {
      "tier": "local",
      "salary_monthly": 3000,
      "regions": "nationale Jugendligen",
      "specializations": ["U17_detection", "neighborhood_clubs"],
      "accuracy_modifier": 0.8,
      "capacity": 3
    },
    {
      "tier": "international",
      "salary_monthly": 8500,
      "regions": "Europa, Südamerika (Top 5 Länder)",
      "specializations": ["elite_detection", "transfer_market_insights"],
      "accuracy_modifier": 1.1,
      "capacity": 6
    },
    {
      "tier": "elite_scout",
      "salary_monthly": 15000,
      "regions": "global",
      "specializations": ["drive_assessment", "breakout_prediction"],
      "accuracy_modifier": 1.3,
      "capacity": 4
    }
  ],
  "hiring_workflow": {
    "search_interface": "Kartenansicht mit verfügbaren Scouts pro Region",
    "screening_icons": {
      "experience_badge": "Anzahl Entdeckungen in der Karriere",
      "trust": "0–100, absolute Zuverlässigkeit",
      "current_availability": "🟢 Frei / 🟡 Belegt / 🔴 Vergeben"
    }
  }
}
```

`capacity` ist die maximale Zahl gleichzeitig beobachteter Ziele.

### 04.3 Scouting-Events

```json
{
  "scouting_events": [
    {
      "id": "u17_european_championship",
      "name": "U17 Europameisterschaft",
      "occur_month": [5, 6],
      "travel_cost": 25000,
      "visibility_boost": "Erhöht Wissen über Teilnehmer um 25 Punkte sofort",
      "discovery_chance": {
        "elite_talent_in_event": "ca. 2 Spieler global",
        "your_scout_sees_them": "70% Chance wenn du teilnimmst"
      },
      "networking_bonus": "Kontakt zu anderen Scouts für zukünftige Tipps (+0.2 Accuracy auf 3 Spieler)"
    },
    {
      "id": "south_american_gathering",
      "name": "Südamerikanisches Nachwuchsturnier",
      "occur_month": [2, 3],
      "travel_cost": 45000,
      "risk": "Reise-Intensiv, erhöht Ermüdung deiner Scouts für 2 Wochen",
      "discovery_chance": {
        "diamond_in_rough": "hohe Wahrscheinlichkeit für unbeachtete Perlen"
      }
    }
  ]
}
```

### 04.4 False Positives (Adus-Trap)

```json
{
  "false_positive_scenarios": [
    {
      "id": "prodigy_trap",
      "mechanic": "Spieler mit Elite-Anlage und niedrigem Drive erscheint im ersten Report als zukünftiger Top",
      "correction_trigger": "Nach 3 Monaten ohne Verbesserung reduziert sich die Schätzung drastisch",
      "visual_feedback": "Scout-Report ändert Icon von 🚀 zu ⚠️"
    },
    {
      "id": "overvaluation_bubble",
      "mechanic": "Media-Hype lässt Schätzungen künstlich hochgehen",
      "burst_condition": "Wenn der Spieler 6 Monate lang keine Fortschritte zeigt, Korrektur um -15 Punkte",
      "warning_signs": "Überdurchschnittliche Medienberichterstattung"
    }
  ]
}
```

### 04.5 Discovery (Region → Verein → Pool) — F4.4 v1

Die Marktliste zeigt nur Spieler im **`scout_pool`** (append-only Player-IDs im Save).
Neue Spiele starten mit leerem Pool; Käufe und Verhandlungen sind ohne Pool-Eintrag blockiert (PRD 05).

| Schritt | Aktion | Ergebnis |
|---|---|---|
| Region | Bis zu **3** abgeschlossene **Regions-Scouts** pro Zone (Netzwerk-Tab / Karte) | `region_scout_tier` 1→3: Fremd-Verzeichnis wächst in Dritteln; Tier 3 = `discovered_region_ids` |
| Verein | **Vereins-Scout** oder **Karten-Reise** (sichtbare Clubs) | Erster Besuch: Profikader → `scout_pool` + `visited_club_ids` (Crest auf Karte). Wiederholbesuche erlaubt. |
| Map-Besuch | Jeder Stopp auf abgeschlossener Route | `uncertainty_range ← max(5, floor(range × 2/3))` für alle Pool-Spieler des Vereins |
| Beobachten | Scout-Zuweisung / Aufträge wie bisher | CI-Bänder enger (04.1), nur für Pool-Spieler |

**Sichtbarkeit Vereinsverzeichnis (36-Clubs-Welt, v1):**

- Alle Clubs der **eigenen Division** sind sofort im Verzeichnis (Name sichtbar).
- Clubs anderer Divisionen erscheinen **stückweise** nach Regions-Scout (⅓ / ⅔ / alle bei Tier 1–3).
- Unbekannte Regionen ohne Liga-Gegner: keine Club-Liste, nur „Region scouten (0/3)“.

Persistenz (`scout_board.discovery`): `region_scout_tier`, `discovered_region_ids`, `visited_club_ids`, `discovered_club_ids` (Legacy-Alias), `scout_pool`.
Aktive Jobs: `active_region_scout`, `active_club_scout` (Fortschritt 0–100, Wochen-Ticks in `advanceScoutWeek`).
Migration: bestehende `targets`-Keys werden in den Pool übernommen; alle Karten-Zonen gelten als entdeckt (Save ≥ 60). Legacy `discovered_region_ids` → Tier 3 pro Zone (Save ≥ 62).

**Pool-Abdeckung (Karte):** Pro Zone/Club Anzeige `{im Pool} / ~{Profis}` nur für **sichtbare** Vereine; engeres Scout-Wissen bleibt Treffer/Assistent (nicht Karte).

**Postfach (F4.4 v1):** Schließen sich Region- oder Vereins-Scout-Jobs ab, landet eine **informative Post-Karte** im Postfach (nicht blockierend für NEXT): Region = Stufe `{tier}/{max}` + sichtbare Vereine; Verein = Kader im Pool + optional 1–3 Namen. Verbrauch durch „Verstanden“; CTAs zu Scout-Netzwerk / Treffer. Queue: `scout_board.discovery_postfach_queue` (Save ≥ 61).

**Ausbaustufe (PRD 21):** optionales Routen-Rätsel beim Regions-Job-Start — keine v1-Pflicht.

### 04.6 Shortlist & Watch-List

- Shortlist hält 20 Spieler.
- Live-Tracking: Sparkline der beobachteten Entwicklung, wöchentlich.
- Push-Alerts: „Großes Talent bei XY verfügbar“. Agenten-Push mit Zufallsfaktor.

### 04.7 Invarianten

| Regel | Überprüfung |
|---|---|
| Scouting senkt Unsicherheit durch Beobachtung | `uncertainty_range` steigt nur durch 04.1 `time_decay`, sonst nie |
| Eigene Spieler = volle Kenntnis | Keine CI-Bänder für Spieler im eigenen Kader oder in der eigenen Akademie, ab dem Tag des Zugangs |
| Scout-Kapazität darf nicht überschritten werden | Clamp bei Assignment |
| Event-Kosten werden sofort abgebucht | Keine Reservierung |

## References

- Player-Schema: PRD 07 (`hidden`)
- Breakout-Events: PRD 06.3
- UI Screens: PRD 09.2 (Screen 3)
- Savegame: PRD 08.3 (Sanitizer)
