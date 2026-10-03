# /docs/prd/16_match_broadcast_beats.md

**Version:** 1.0  
**Last Updated:** 2026-10-03  
**Status:** Draft (Spezifikation — Director noch nicht implementiert)

---

## Purpose

Match-**Beats** sind die narrative Einheit *über* einzelnen Engine-Ticks. Sie steuern
Pacing, Doppelstimme (Play-by-Play + Farbkommentar) und spätere Story-Slots — ohne die
Engine (`server/src/engine/`) zu verändern (Gesetz 4, PRD 14.10).

**Heute:** `commentate()` + `isCommentaryWorthy()` → eine Template-Zeile pro
worthy Event.  
**Ziel:** **Broadcast Director** wählt Beats, füllt Slots aus Fakten, optional LLM
nur in freigegebenen Slots (PRD 01 — Template-Fallback).

---

## Scope

**In**

- Beat-Taxonomie und Director-Zustände
- Mapping Engine-`MatchEvent` → Beat-IDs
- Regeln für PBP vs. Color, Priorität, Unterdrückung, Makro-Ketten
- Anbindung an `MatchView` (eine Event-Quelle für Log + 2D + HUD)
- Story-/Chronik-Slots (read-only aus Savegame)

**Out**

- Engine-Änderungen, neue Event-Typen, Taktik-Sim
- Club-Cockpit (PRD 14), Karriere-Narrative außerhalb des Spieltags (PRD 13, `story_state`)
- Generative Bild-KI (PRD 01)

**Dependencies:** PRD 01, 08, 09.3, 14.10, `shared/src/match-event.ts`,
`server/src/commentary/`, `server/src/api/match-view.ts`, `src/narrative/story-state.ts`

---

## Begriffe

| Term | Bedeutung |
|------|-----------|
| **Engine tick** | Ein `MatchEvent` mit `seq`, `clock`, `ball`, `involved` |
| **Worthy tick** | Tick, für den `isCommentaryWorthy()` eine Zeile erlaubt |
| **Beat** | Kurzes narrative Segment (0–3 s Sprechzeit), kann 1+ Ticks bündeln |
| **Slot** | Platzhalter im Beat (`{shooter}`, `{score}`, `{third}`) — nur aus Fakten |
| **Line** | Ausgegebener Text (DE in UI), erscheint in `MatchViewLine` |
| **PBP** | Play-by-play — was passiert *jetzt* |
| **Color** | Analyst — Kontext, Muster, keine erfundenen Tore/Tabellen |
| **Director** | Zustandsmaschine + Prioritäten; sitzt zwischen Event-Stream und `commentate` |

---

## Design-Grundsätze

1. **Eine Quelle:** Director liest denselben Stream wie `buildMatchView` — kein
   Parallel-Log.
2. **Weizenbaum-Leiste:** Color darf dramatisieren (Tempo, Ton), nicht simulieren
   (falsches Ergebnis, erfundene Verletzung, fremde Tabelle).
3. **Icon/visual first:** Beat-Typ bestimmt HUD-Cue (`shot`, `goal`, …) und
   Hervorhebung im Ereignisse-Feed — nicht nur Text.
4. **Deutsch in der Zeile,** Namen in der Zeile (PRD 14.10).
5. **Determinismus:** `hash(match_seed, seq, beat_id)` für Template-Varianten und
   spätere lokale LLM-Auswahl.
6. **Unterdrückung:** Lieber eine starke Beat-Zeile als drei schwache Ticks
   (Fortsetzung von `isCommentaryWorthy`).

---

## Director (Zustandsmodell)

```text
                    ┌─────────────┐
                    │   IDLE      │  open_play, keine laufende Kette
                    └──────┬──────┘
                           │ worthy tick / phase change
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ SET_PIECE  │  │ ATTACK     │  │ STOPPAGE   │
    │ (restart)  │  │ (chain)    │  │ foul/card  │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          └───────────────┴───────────────┘
                           │
                    emit 0–2 lines
                    (PBP mandatory, Color optional)
                           │
                           ▼
                    ┌─────────────┐
                    │   IDLE      │
                    └─────────────┘
```

**Director-Speicher (pro Spiel, im Wrapper, nicht im Savegame v1):**

- `attack_team_id`, `chain_depth`, `last_beat_id`
- `set_piece_phase` (`corner` | `free_kick` | …)
- `cooldown_color_until_seq` (Color nicht jeden Tick)

---

## Beat-Taxonomie (IDs)

Konvention: `snake_case`, Präfix nach Domäne.

### A — Spielstruktur

| beat_id | Trigger (Engine) | PBP | Color | Priorität |
|---------|------------------|-----|-------|-----------|
| `match_opening` | erstes `kickoff`, `clock` HF 0′ | ✓ | optional | P0 |
| `half_time` | `period_end` first_half | ✓ | optional | P0 |
| `second_half_open` | `kickoff` nach HF | ✓ | — | P0 |
| `full_time` | `match_end` | ✓ | optional | P0 |

### B — Standards & Ruhephasen

| beat_id | Trigger | PBP | Color | HUD cue |
|---------|---------|-----|-------|---------|
| `restart_throw_in` | `restart` throw_in | ✓ | — | `throw_in` |
| `restart_corner` | `restart` corner | ✓ | rare | `corner` |
| `restart_free_kick` | `restart` free_kick | ✓ | optional | — |
| `restart_penalty` | `restart` penalty | ✓ | ✓ | `penalty` |
| `restart_goal_kick` | `restart` goal_kick | ✓ | — | — |

### C — Ballbesitz & Aufbau

| beat_id | Trigger | Worthy-Regel | PBP | Color |
|---------|---------|--------------|-----|-------|
| `pass_complete` | `pass` complete | worthy filter | ✓ | — |
| `pass_key` | `pass` cross/through/switch | immer worthy | ✓ | optional |
| `pass_incomplete` | `pass` !complete | true | ✓ | — |
| `carry_progress` | `carry` | Länge ≥ 7, nicht Doppel-carry | ✓ | — |
| `duel_won` | `duel` | true | ✓ | — |
| `turnover` | `turnover` | true | ✓ | optional |

### D — Gefahr & Abschluss

| beat_id | Trigger | PBP | Color | HUD |
|---------|---------|-----|-------|-----|
| `shot_taken` | `shot` (alle outcomes) | ✓ | rare | `shot` |
| `shot_goal` | `shot` outcome goal **oder** `goal` | ✓ | ✓ | `goal` |
| `shot_saved` | `shot` save / `save` | ✓ | — | `shot` |
| `shot_wide` | `shot` wide | ✓ | — | `shot` |
| `shot_woodwork` | `shot` woodwork | ✓ | optional | `shot` |
| `shot_blocked` | `shot` block | ✓ | — | optional |

### E — Disziplin & Unterbrechung

| beat_id | Trigger | PBP | Color |
|---------|---------|-----|-------|
| `foul` | `foul` ohne Karte | ✓ | — |
| `card_yellow` | `card` / foul+yellow | ✓ | optional |
| `card_red` | red / second_yellow | ✓ | ✓ |
| `offside` | `turnover` reason offside | ✓ | — |
| `injury` | `injury` | ✓ | optional |
| `substitution` | `substitution` | ✓ | — |

---

## Makro-Beats (Ketten)

Makro-Beats sind **virtuelle** IDs — der Director erkennt sie aus 2–6 Ticks,
emittiert aber weiterhin 1–2 Zeilen mit Ketten-Kontext.

| macro_id | Muster (vereinfacht) | Beispiel-Sprache (Color) |
|----------|----------------------|---------------------------|
| `macro_press_turnover` | `duel` → `turnover` in Mitteldrittel | „Die erste Pressing-Lücke.“ |
| `macro_wide_switch` | `pass` switch → `carry` → `cross` | „Seitenwechsel, jetzt die Flanke.“ |
| `macro_box_siege` | 2+ `pass`/`carry` in Angriffsdrittel → `shot` | „Dauerdruck — und jetzt der Abschluss.“ |
| `macro_counter` | `turnover` in eigenem Drittel → `carry` lang → `shot` | Klassiker Gegenstoß |
| `macro_set_piece_threat` | `restart` corner/fk → `shot` innerhalb N Ticks | „Standardsituation wird gefährlich.“ |
| `macro_near_miss` | `shot` woodwork/wide nach `pass` through | „Die große Chance.“ |

**Beispiel-Kette (dein Spreadsheet-DNA):**

```text
free_kick → slip (turnover/pass incomplete) → counter (carry+pass) → save
     │              │                              │                 │
 restart_free_kick  turnover/pass_incomplete      macro_counter     shot_saved
```

Erkennung: Fenster `seq .. seq+K`, `attack_team_id` wechselt maximal einmal,
Abschluss mit `shot_*`.

---

## Mapping: Engine → beat_id (Implementierungs-Referenz)

| `event.type` | Zusatz | beat_id |
|--------------|--------|---------|
| `kickoff` | opening / 2nd half | `match_opening` / `second_half_open` |
| `pass` | complete + kind | `pass_key` oder `pass_complete` / `pass_incomplete` |
| `carry` | — | `carry_progress` |
| `duel` | — | `duel_won` |
| `shot` | outcome | `shot_*` (siehe D) |
| `goal` | — | `shot_goal` |
| `save` | — | `shot_saved` |
| `turnover` | offside | `offside` / sonst `turnover` |
| `foul` | card? | `foul` / `card_*` |
| `card` | color | `card_yellow` / `card_red` |
| `restart` | phase | `restart_*` |
| `substitution` | — | `substitution` |
| `injury` | — | `injury` |
| `period_end` | — | `half_time` |
| `match_end` | — | `full_time` |

**Nicht worthy:** Director emittiert **keine** Line; Tick bleibt in `frames` /
2D. Siehe `isCommentaryWorthy()` in `server/src/commentary/render.ts`.

---

## Ausgabe-Contract (Ziel)

```typescript
// server/src/commentary/director.ts (geplant) — nicht in Engine
type BroadcastLine = {
  seq: number;           // letzter Tick der Beat
  beatId: string;
  voice: "pbp" | "color";
  text: string;          // DE, Template oder LLM-Slot-Fill
  macroId?: string;
};

type DirectorInput = {
  event: MatchEvent;
  previous?: MatchEvent;
  ctx: CommentaryContext;
  story?: Pick<StoryState, "fan_feed" | "beats_fired">; // read-only
  chronicle?: string[];  // Kurzrefs, keine Erfindung
};
```

`buildMatchView` ersetzt direkten `commentateLine`-Aufruf durch
`directorLines(event, …)` — gleiche `seq`, mehrere Zeilen nur wenn PBP+Color.

---

## Story-Slots (Phase 2)

Read-only aus Savegame / `story_state` — **nur** wenn Fakt passt:

| slot_key | Quelle | Erlaubte Color-Einlage |
|----------|--------|-------------------------|
| `table_pressure` | Liga-Tabellenposition Spielerclub | „Sie brauchen Punkte.“ |
| `relegation_beat` | PRD 13 Slice aktiv | nur wenn Tabellenlage stimmt |
| `fan_mood` | `story_state.fan_feed[0]` | Paraphrase, kein neuer Score |
| `derby` | Fixture-Metadaten | nur Derby-Paarungen |

Kein Slot ohne `fact_check(slot) === true`.

---

## Priorität & Kollision

| Prio | Beats | Regel |
|------|-------|-------|
| P0 | goal, red, penalty, match_opening, full_time | unterdrückt laufende Kette |
| P1 | shot_*, card_yellow, injury | bricht Color-Cooldown |
| P2 | macro_*, pass_key | kann Color triggern |
| P3 | pass_complete, duel, carry | PBP only default |

Wenn zwei Beats im selben Tick: **ein** PBP + höchstens **ein** Color.

---

## Implementierungsreihenfolge (Stream B)

| Phase | Deliverable | Code-Ort |
|-------|-------------|----------|
| **B0** | DE-Templates, Events HUD, fixes Scroll | ✓ (14.10 Slice) |
| **B1** | `beat_id` aus Event + Tests | `server/src/commentary/beats.ts` ✓ |
| **B2** | Director IDLE/SET_PIECE/ATTACK + Macro-Fenster | `server/src/commentary/director.ts` ✓ |
| **B3** | P3-Unterdrückung (kein PBP für pass/carry/duel) | `server/src/commentary/suppression.ts` ✓ |
| **B3b** | Doppelzeile PBP+Color + UI-Ticker (`voice`, Stagger) | `shared/match-view.ts`, `src/match/` ✓ |
| **B4** | Story-Slots + Chronik | `director.ts` + `story-state` |
| **B5** | Lokales LLM nur für `color` Slots mit Fallback | PRD 01 |

---

## Test-Anforderungen

- Golden: Seed 2026 — feste Liste `(seq, beat_id)` für erste 50 worthy Events
- Macro: synthetische Event-Liste `free_kick → … → save` → `macro_set_piece_threat` oder `macro_counter`
- **Kein** Test erfindet Events — nur recorded streams oder `buildMatchView`

---

## Invarianten

| Regel | Prüfung |
|-------|---------|
| Gesetz 4 | Kein Import aus `server/src/engine/` in Director außer Typen |
| PRD 01 | LLM optional; Template-Fallback immer |
| PRD 14.10 | Deutsch, Namen in Zeile, eine Event-Quelle |
| Weizenbaum | Color-Zeilen unit-test: keine Score/Spieler die nicht in `event`/`state` |

---

## References

- Aktuelle Templates: `server/src/commentary/render.ts`
- View-Projektion: `server/src/api/match-view.ts`
- Karriere-Narrative (Woche): `src/narrative/` (nicht Spieltag-Director)
- UI: PRD 14.10, `src/match/EventsFeed.tsx`, `EventsHud.tsx`
