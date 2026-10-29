# /docs/prd/06_breakouts.md

**Version:** 1.2
**Last Updated:** 2026-10-10
**Status:** Final

---

## Purpose

Definition des Breakout/Slump-Event-Systems: seltene Lebensereignisse, die `drive`, `anlage`, `maturity_offset` oder temporäre Modifier dauerhaft im Sinne von „einmal passiert“ verändern. Das sind die Verläufe hinter Late Bloomern, Arbeitstieren und geplatzten Wunderkindern.

---

## Scope

- Breakout-Event-Engine (`/src/development/breakouts.ts`)
- Event-Definitionen (`/data/rules/breakout_events.json`)
- Narrative-Templates (`/data/rules/event_narratives.json`)
- Drive-Mutations-Logik

**Dependencies:** PRD 02 (Growth Engine), PRD 07 (`hidden.breakout_flags`, `state.modifiers`), PRD 08 (Event-Log)

---

## Design-Grundsätze

1. **Events sind selten.** Im Schnitt 0–2 solcher Events pro Spielerkarriere.
2. **Jedes Event feuert höchstens einmal pro Spieler.** Die ID landet immer in `hidden.breakout_flags`. `permanent: true` heißt: der Zahlen-Effekt bleibt. `expires` heißt: der Zahlen-Effekt endet, die Flagge bleibt.
3. **Events sind asymmetrisch sichtbar.** Der Manager sieht die Narrative, nie die Zahlen. Versteckte Events zeigen sich nur als Stagnation im Chart.
4. **Karma ist erlaubt.** Verdiente Events sind wahrscheinlicher als reine Zufälle. Beides existiert.
5. **Trigger lesen nur vorhandenen Zustand.** Effekte schreiben nur in Felder aus PRD 07: `hidden.drive`, `hidden.maturity_offset`, `hidden.anlage`, `state.morale`, `attributes`, `state.modifiers`.

---

## Specification

### 06.1 Event-Kategorien

| Kategorie | Valenz | Freq. pro Karriere (Ø) | Beispiele |
|---|---|---|---|
| `breakout` | positiv | 0.3 | Groschen fällt, Vorbild, Beweisdrang |
| `slump` | negativ | 0.5 | Erfolgsblähung, Wunderkind-Last, Reha-Frust |
| `neutral_catalyst` | beide | 0.4 | Vereinswechsel |
| `generational` | positiv | bei Generierung | Marker `prodigy_foundation` |

`generational` ist kein Laufzeit-Event. PRD 03.1, Mixture-Komponente 4 (Mean 120), setzt die Flagge bei der Erzeugung.

### 06.2 Event-Definitionen

`requires_flag` und `requires_not_flagged` sind immer Arrays von IDs. Jedes Event hat `karma_weight`.

```json
{
  "events": [
    {
      "id": "late_bloomer_kick",
      "category": "breakout",
      "name": "Der Groschen fällt",
      "trigger": {
        "conditions": {
          "age_min": 21,
          "age_max": 29,
          "drive_min": 0.9,
          "recent_growth_total": "> 8",
          "requires_not_flagged": ["late_bloomer_kick"]
        },
        "weekly_probability": 0.004
      },
      "effect": {
        "drive_delta": 0.2,
        "maturity_offset_delta": 2,
        "permanent": true
      },
      "visibility": "full",
      "narrative_template": "{player_first} wirkt wie ausgewechselt — der Trainerstab spricht von einem anderen Menschen auf dem Platz.",
      "karma_weight": 1.5
    },
    {
      "id": "mentor_ignition",
      "category": "breakout",
      "name": "Vorbild-Wirkung",
      "trigger": {
        "conditions": {
          "age_max": 23,
          "assigned_mentor_drive": ">= 1.3",
          "mentorship_months": ">= 6",
          "requires_not_flagged": ["mentor_ignition"]
        },
        "weekly_probability": 0.006
      },
      "effect": {
        "drive_delta": 0.25,
        "permanent": true
      },
      "visibility": "full",
      "narrative_template": "{player_first} ahmt {mentor_first} inzwischen nach — auch abseits des Platzes.",
      "karma_weight": 1.0
    },
    {
      "id": "underdog_resolve",
      "category": "breakout",
      "name": "Beweisdrang",
      "trigger": {
        "conditions": {
          "media_snub_streak": ">= 8 Wochen",
          "morale_min": 40,
          "requires_not_flagged": ["underdog_resolve"]
        },
        "weekly_probability": 0.003
      },
      "effect": {
        "drive_delta": 0.15,
        "modifiers": [
          { "attribute": "composure", "delta": 5, "weeks": 12 }
        ]
      },
      "visibility": "partial",
      "narrative_template": "{player_first} hat sich etwas vorgenommen. Man sieht es an jedem Training.",
      "karma_weight": 1.2
    },
    {
      "id": "success_inflation",
      "category": "slump",
      "name": "Erfolgsblähung",
      "trigger": {
        "conditions": {
          "new_contract_wage_multiplier": ">= 3x",
          "drive_max": 0.9,
          "age_max": 27,
          "requires_not_flagged": ["success_inflation"]
        },
        "weekly_probability": 0.008
      },
      "effect": {
        "drive_delta": -0.25,
        "permanent": true
      },
      "visibility": "hidden",
      "narrative_template": null,
      "karma_weight": 1.0
    },
    {
      "id": "prodigy_pressure",
      "category": "slump",
      "name": "Wunderkind-Last",
      "trigger": {
        "conditions": {
          "requires_flag": ["prodigy_foundation"],
          "media_hype_level": ">= high",
          "club_is_top": true,
          "requires_not_flagged": ["prodigy_pressure"]
        },
        "weekly_probability": 0.005
      },
      "effect": {
        "drive_delta": -0.3,
        "morale_delta": -20,
        "attribute_delta": { "composure": -5 },
        "permanent": true
      },
      "visibility": "partial",
      "narrative_template": "Die Erwartungen erdrücken {player_first}. Zu viele Interviews, zu wenig Fußball.",
      "karma_weight": 1.4
    },
    {
      "id": "injury_desperation",
      "category": "slump",
      "name": "Reha-Frust",
      "trigger": {
        "conditions": {
          "injury_weeks_remaining": ">= 10",
          "injury_severity": "severe",
          "requires_not_flagged": ["injury_desperation"]
        },
        "weekly_probability": 0.01
      },
      "effect": {
        "drive_delta": -0.15,
        "modifiers": [
          { "fitness_regen_multiplier": 0.8, "until_injury_end": true }
        ]
      },
      "visibility": "hidden",
      "narrative_template": null,
      "karma_weight": 1.0
    },
    {
      "id": "environment_shift_positive",
      "category": "neutral_catalyst",
      "name": "Neuanfang",
      "trigger": {
        "conditions": {
          "event": "club_transfer",
          "previous_club_morale": "< 40",
          "age_min": 18,
          "age_max": 26,
          "requires_not_flagged": ["environment_shift_positive"]
        },
        "probability_on_event": 0.35
      },
      "effect": {
        "drive_delta": 0.15,
        "morale_set": 75,
        "permanent": true
      },
      "visibility": "full",
      "narrative_template": "Der Wechsel tut {player_first} sichtlich gut. Endlich Spielzeit, endlich Vertrauen.",
      "karma_weight": 1.0
    },
    {
      "id": "environment_shift_negative",
      "category": "neutral_catalyst",
      "name": "Falscher Verein",
      "trigger": {
        "conditions": {
          "event": "club_transfer",
          "match_fit_cluster": "poor",
          "requires_not_flagged": ["environment_shift_negative"]
        },
        "probability_on_event": 0.25
      },
      "effect": {
        "drive_delta": -0.2,
        "permanent": true
      },
      "visibility": "hidden",
      "narrative_template": null,
      "karma_weight": 1.0
    }
  ],
  "global_config": {
    "weekly_check_order": [
      "injury_desperation",
      "prodigy_pressure",
      "success_inflation",
      "late_bloomer_kick",
      "mentor_ignition",
      "underdog_resolve"
    ],
    "on_event_ids": [
      "environment_shift_positive",
      "environment_shift_negative"
    ],
    "one_event_per_week_per_player": true,
    "narrative_cooldown_weeks": 2
  }
}
```

Mentoring als Beziehung (Mentor zugewiesen, Monate, Drive des Mentors) ist Feature F2.4, spezifiziert in PRD 29. `mentor_ignition` liest diese drei Bedingungen vom Spieler. Es gibt keinen wöchentlichen Drive-Trickle von +0.05.

### 06.3 Trigger-Typen

**A) Wöchentlich.** Bedingungen prüfen, dann `weekly_probability` würfeln. Nur IDs in `weekly_check_order`.

**B) Ereignisgekoppelt.** Einmal `probability_on_event` würfeln, wenn das Welt-Ereignis eintritt. Nur IDs in `on_event_ids`. Der Wochen-Loop überspringt sie.

| Trigger-Feld | Quelle |
|---|---|
| age_min / age_max | `player.age` |
| drive_min / drive_max | `player.hidden.drive` |
| recent_growth_total | Summe der Attribut-Zuwächse der letzten 26 Wochen |
| requires_flag / requires_not_flagged | `player.hidden.breakout_flags` |
| assigned_mentor_drive, mentorship_months | F2.4, sobald die Beziehung existiert |
| media_hype_level, media_snub_streak | Medienmodul, sobald es existiert (F9.4) |
| new_contract_wage_multiplier | Vertragsabschluss (PRD 05.4) |
| injury_* | `player.state.injury` |
| event | Welt-Ereignis, z. B. Transfer |

Felder, die noch kein Modul schreibt, sind einfach nie erfüllt. Dafür werden keine Platzhalter-Systeme gebaut.

### 06.4 Karma-Gewichtung

```text
effective_probability = base_probability × karma_weight × player_karma_modifier
```

`base_probability` ist `weekly_probability` oder `probability_on_event`. `player_karma_modifier` liegt in [0.5, 1.5] und kommt aus Trainingsintensität, Mentor-Qualität und Medienlage. In M1 ist der Modifier 1.0, bis diese Signale existieren.

### 06.5 Sichtbarkeit

| Stufe | Manager sieht | UI (PRD 09.2 Screen 4a) |
|---|---|---|
| full | Narrative sofort als News-Item | 💡 in der Timeline, Tooltip mit Narrative |
| partial | Narrative nur im eigenen Kader oder bei Scout-Wissen | Icon ggf. verspätet |
| hidden | Nichts | Kein Icon. Der Chart zeigt den Verlauf |

### 06.6 Effekt-Anwendung

- Sofort anwenden. `history.jsonl` speichert Event-ID, `player_id` und Woche, keine Effekt-Zahlen.
- `drive_delta` wird auf [0.4, 1.6] geclamp (PRD 07.3).
- `maturity_offset_delta` wird auf [−5, +5] geclamp.
- Attribut-Deltas werden auf die Skill-Grenzen aus PRD 07 geclamp.
- Jeder Feuer-Vorgang schreibt die Event-ID in `breakout_flags`, auch wenn der Zahlen-Effekt später abläuft.
- `modifiers` werden an `player.state.modifiers` gehängt (PRD 07). `until_injury_end` endet, wenn `state.injury` null wird. `weeks` endet nach so vielen Wochenupdates.
- Abgelaufene Modifier entfernt das Wochenupdate.

### 06.7 Verarbeitung

```typescript
function processWeeklyBreakoutChecks(world: WorldState): void {
  for (const player of world.allPlayers) {
    for (const eventId of BREAKOUT_CONFIG.weekly_check_order) {
      const def = getEventDef(eventId);
      if (player.hidden.breakout_flags.includes(def.id)) continue;
      if (inNarrativeCooldown(player, def)) continue;
      if (!checkConditions(def.trigger.conditions, player, world)) continue;

      const p = def.trigger.weekly_probability * def.karma_weight * getKarmaModifier(player, world);
      if (world.rng.hash(player.id, eventId, world.week) < p) {
        applyEffect(player, def.effect);
        player.hidden.breakout_flags.push(def.id);
        logToHistory(player, def, world.week);
        if (def.visibility !== "hidden") publishNarrative(player, def);
        break;
      }
    }
  }
}
```

`processOnWorldEvent` macht dasselbe mit `probability_on_event` und `on_event_ids`. Ohne das auslösende Welt-Ereignis wird nicht gewürfelt.

RNG: Hash über `(player, event, week)` bzw. `(player, event, world_event_id)` nach PRD 08.6.

### 06.8 Balance-Richtwerte

Kalibriert gegen die Punkteformel in PRD 02.1 (Basis 1.0 pro Woche vor den Faktoren).

- `late_bloomer_kick` (+0.2 drive) hebt das wöchentliche Wachstum um etwa 12 %, solange drive der einzige geänderte Faktor ist. Über fünf Jahre sind das grob +6–10 Punkte. Bedeutsam, kein Spielbruch.
- `success_inflation` (−0.25 drive) kostet über fünf Jahre grob 8–12 Punkte. Ein Adu-Verlauf braucht zusätzlich schlechtes Umfeld oder weitere Events.
- Zielkorridor über 100 simulierte Karrieren: 3–5 Bögen „Krise zu starkem Profi“, 5–8 Bögen „Wunderkind zur Bank“.

### 06.9 Narrative-Templates

- Datei `/data/rules/event_narratives.json`.
- Platzhalter: `{player_first}`, `{mentor_first}`, `{club_name}`.
- Sprachen: `de` und `en` unter `narrative.<event_id>.<lang>`.
- Höchstens zwei Sätze (PRD 09.1).
- `hidden`-Events haben `narrative_template: null`.

### 06.10 Invarianten

| Testfall | Erwartetes Ergebnis |
|---|---|
| `late_bloomer_kick` ein zweites Mal für denselben Spieler | Blockiert durch die Flagge |
| drive = 1.5, `drive_delta` +0.25 | Ergebnis 1.6 |
| Hidden-Event gefeuert | Kein News-Item, Eintrag im Event-Log |
| Spieler unter der Altersgrenze | Wird nicht gewürfelt |
| Modifier mit `until_injury_end`, Verletzung vorbei | Modifier im nächsten Wochenupdate weg, Flagge bleibt |
| Identischer RNG-Seed, identische Woche | Dieselben Events |
| `environment_shift_*` ohne Transfer | Wird im Wochen-Loop nicht gewürfelt |

### 06.11 Tier-2 Story-Szenarien (v1.2)

Zusätzlich zu den Tier-1-Events (Drive/Moral) gibt es **zehn Tier-2-Risse** mit `weekly_growth_multiplier` (Produkt, Clamp 0.4–2.5 in der Growth Engine). IDs: `obscure_to_main_striker`, `finishing_school_click`, `call_up_spark`, `rehab_rebirth`, `tactical_unlock`, `golden_boy_fracture`, `after_the_summit` (event-gekoppelt an Event-Stamp `torjaeger_saison`), `bench_identity_crisis`, `hype_backlash`, `injury_spiral`.

- **Seltenheit:** Basis-`weekly_probability` 0.0008–0.002; Karma bei hohem Drive (+Breakout) bzw. hohem Drive (−Slump) wie in 06.4.
- **Länderspiel:** bis F10.6 Proxy über Tor/Assist-Serie + Marktwert (`call_up_spark`).
- **Fremdspieler:** Narrative in Club-Events (Scout) und «Der Treter» (`rival_breakout_narratives` in Pipeline).
- **UI:** Profil-Timeline für `full` + `partial` (PRD 09.2 Screen 4a).

## References

- Growth-Engine: PRD 02.1, PRD 02.2
- Intake und Generational-Flag: PRD 03.1
- Player-Schema: PRD 07
- Savegame: PRD 08.1, PRD 08.6
- UI: PRD 09.2 Screen 4a
