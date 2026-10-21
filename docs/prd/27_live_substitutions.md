# /docs/prd/27_live_substitutions.md

**Version:** 0.1
**Last Updated:** 2026-10-21
**Status:** Draft — Feature **F1.9** (Slice 1), vorgezogen nach Agent-Playtest 2026-10-21

---

## Purpose

Der Manager kann im Spiel **auswechseln** und zur **Halbzeit** eingreifen. Heute
wechselt die Engine für das menschliche Team nie (`usesAutoSubs` in
`server/src/engine/discipline.ts:24` schließt `humanTeamId` aus) und es gibt keinen
Eingabeweg. Im Playtest fiel der einzige Stürmer in der 25. Minute verletzt aus —
der Spieler konnte nur zusehen.

Ziel ist **kein** Match-als-Sportspiel (PRD 10 Non-Features): wenige, gewichtige
Entscheidungen an klaren Unterbrechungen, nicht Echtzeit-Steuerung.

---

## Scope

**In (Slice 1):**
- Manuelle Wechsel (max. 3, Engine-`MAX_SUBS`) bei **Pause**, **Halbzeit** und **Verletzungs-Prompt**.
- Verletzungs-Prompt: Spiel pausiert automatisch, Bank-Vorschlag (gleiche Rolle zuerst, wie `pickSubstitute`).
- Halbzeit-Screen: Statistik, Wechsel, Taktik-Preset wechseln (3 Slots, F1.2).
- Assistent-Default: Wird der Prompt ignoriert („Assistent entscheiden"), greift heutiger Auto-Wechsel.
- „Simulate match" (Schnellsimulation) = Assistent wechselt automatisch wie die KI.

**Out (später, F1.9 Slice 2 / M3):**
- Taktik-Slider live (Mentalität, Pressing, Linie) zu beliebigen Zeitpunkten.
- Shouts / Ansprache, Rollentausch ohne Wechsel, Formationswechsel live.

---

## Technischer Ansatz

Das Spiel wird heute **vollständig vorab simuliert** (`buildMatchView`,
`server/src/api/match-view.ts:124`) und dann abgespielt. Die Engine exportiert aber
`createInitialState`, `step`, `stepMany` (`server/src/engine/index.ts`) — sie ist
**fortsetzbar**.

1. **Segmentierte Simulation im Wrapper** (Engine bleibt unverändert, PRD 17):
   simulieren bis zum nächsten Entscheidungspunkt (Halbzeit, Verletzung des
   menschlichen Teams, oder Ende), `MatchState` als Checkpoint halten.
2. Entscheidungspunkte für `humanTeamId`:
   - `period_end` (Halbzeit)
   - `injury` eines eigenen Spielers (heute → `pendingSubstitution`)
   - manuelle Pause (Wechsel greift beim nächsten Ball-aus-dem-Spiel, `restart`)
3. Wechsel anwenden: neuer Wrapper-Input `substitutionRequest {offId, onId}` →
   ein `substitution`-Event über bestehendes `stepSubstitution`-Muster.
   **Einzige Engine-Änderung:** `stepSubstitution` akzeptiert optional eine
   gewünschte `onId` (statt immer `pickSubstitute`). Invarianten
   (`invariants.ts:35-99`, max. 3, kein Wiedereinwechseln) bleiben.
4. Weitersimulieren ab Checkpoint mit demselben RNG-Zustand → Determinismus:
   gleiche Entscheidungen ⇒ gleiches Spiel (Golden-Tests bleiben gültig, solange
   kein Wechsel angefordert wird).
5. Playback hängt neue Frames an; Kommentar-Director läuft weiter
   (`substitution`-Beat existiert, PRD 16 Gruppe E).

---

## UI

- `CareerMatch`: Bank-Panel (heute nur Line-ups-Tab) bekommt im Pausenzustand
  „Wechseln" je Bankspieler; Drag auf Feldspieler oder Klick-Paar.
- Verletzungs-Prompt als Modal mit Feldspieler, Verletzung, 2–3 Vorschlägen.
- Halbzeit-Karte zwischen den Hälften (Score, Schüsse, Fitness der Elf, Wechsel, Preset).
- Wechsel-Ticker `MatchSubstitutionTicker.tsx` — Label über i18n (heute hart „Wechsel").
- Spielbericht: Wechsel mit Minute.

---

## Invarianten

| Regel | Prüfung |
|---|---|
| Max. 3 Wechsel, kein Wiedereinwechseln | `invariants.ts` |
| Ohne Eingriff identisches Spiel | Golden Seed 2026 unverändert |
| Engine-Kern nur minimal (optionale `onId`) | Review PRD 17 |
| Kein Echtzeit-Mikromanagement | nur Pause/HZ/Verletzung |

## References

- PRD 10 F1.9, PRD 16 (Beat `substitution`), PRD 14.10 (Match-UI), PRD 17 (Engine-Wrapper)
- `server/src/engine/discipline.ts` (`usesAutoSubs`, `pickSubstitute`, `stepSubstitution`)
- Playtest: `docs/research/playtest-logs/2026-10-21-agent-run-1.md`
