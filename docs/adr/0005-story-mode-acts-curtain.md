# ADR 0005 — Story Mode: abgeleiteter Vorhang und Akt-Übergang

- Status: angenommen
- Datum: 2026-10-23

## Kontext

PRD 24 sieht drei Produktmodi auf einer Simulation vor. Bisher war nur der Regionalliga Manager spielbar. Für Story Mode gab es Typen und ein unbenutztes `storyModeAct1StoryState`. `act1FeatureCurtain()` gab sogar den vollen Vorhang zurück, entgegen der PRD-19-Matrix.

Story Mode braucht einen Vorhang, der sich pro Spielstand schrittweise öffnet (Act-2-Unlocks), und einen Vereinswechsel am Ende von Akt 1. Dabei gelten drei Einschränkungen:

- Die Sim bleibt unverändert (PRD 24). Abstieg und Klassenerhalt entstehen nur aus gespielten Partien.
- Modi duplizieren keine Nav- oder NEXT-Logik. Alles läuft über `resolveFeatureCurtain` und `resolvePresentationMode`.
- Gesperrte Screens dürfen keine Sackgasse erzeugen (PRD 19).

## Entscheidung

1. **Der Vorhang wird abgeleitet, nicht gespeichert.**
   - `deriveFeatureCurtain(game_mode, career_phase, curtain_unlocks)` ist die einzige Quelle.
   - Regionalliga Manager und NG+ bekommen immer den vollen Vorhang. Story Mode bekommt in Akt 1 und 2 den PRD-19-Akt-1-Vorhang plus die Unlocks. Ab Akt 3 ist alles offen.
   - `feature_curtain` im Save ist nur ein Cache. `normalizeStoryState` baut ihn neu auf.
2. **Unlocks sind eine Liste, die nur wächst.**
   - `story_state.curtain_unlocks: CurtainUnlockId[]`, gesetzt über `grantCurtainUnlock` (idempotent).
   - Jeder Unlock kommt aus einem Inbox-Beat und liefert eine Chronik-Zeile, einen Cast-Beat und ein Vorhang-Flag (PRD 19, Säule 3).
   - Der Unlock wird beim **Auflösen** des Beats gewährt, nicht beim Auslösen. Offene Inbox-Items blockieren ohnehin NEXT.
3. **Der Akt-1-Abschluss wird eingefroren.**
   - Am Saisonende von Akt 1 schreibt die Sim `story_state.act_transition`: Ausgang aus den Auf- und Abstiegsbewegungen, drei Oberliga-Angebote, ein bis zwei Begleiter.
   - Der Spieler wählt danach in einem Modal. Angebote und Begleiter driften bis zur Wahl nicht mehr.
4. **Entlassung hängt vom Akt ab.**
   - Akt 1: nie.
   - Akt 2: nur am Saisonende (geduldiger Vorsitzender).
   - Danach: Standardregeln.
   - Mahnschreiben bleiben in allen Akten. Das ist eine Karriere-Regel; die Engine bleibt unberührt.
5. **Legenden sind Namens-Snapshots.**
   - `switchManagerClub` erzeugt die Jugend des neuen Vereins neu, die alte Jugend verschwindet.
   - `legend_players` speichert deshalb Name, Position und Herkunft für spätere Chronik-Callbacks. Begleiter wechseln als echte Spieler mit.
6. **Die Moduswahl ist ein Gate vor dem Opening.**
   - Ein frischer Save ohne `game_mode_confirmed` zeigt zuerst die Moduskarte.
   - Das deckt alle drei Einstiege ab (Erststart, Slot-Karte, Menü „Neues Spiel“).
   - Saves ohne das Feld gelten als bestätigt.

## Alternativen

- **Gespeicherten Vorhang direkt verwenden:** Er kann von Phase und Modus abweichen (alte Saves, Tests). Diese Abweichung hatte die Regel „ignore stale saved feature_curtain“ bereits verhindert. Verworfen.
- **Vorhang pro Akt-Woche statt Unlock-Liste:** Choice-Payoffs können Unlocks verschieben, das ließe sich nicht abbilden. Verworfen.
- **Vereinswechsel direkt in der Season-End-Pipeline:** Der Spieler hätte keine Wahl, und die Pipeline bekäme UI-Abhängigkeiten. Verworfen.
- **Alte Jugend als Rival-Spieler behalten:** `rivalPlayersForTeam` filtert nicht nach `squad_status`. Jugendliche würden in KI-Startelfen landen (Gesetz 6). Verworfen.

## Konsequenzen

- Story Mode verlangt `SAVE_VERSION` 97 (Migration 097 normalisiert nur).
- Jeder Screen-Link (Hub-Panels, Postfach, Chips) muss den Vorhang respektieren. Ein Link ohne Handler wird nicht gerendert. Das schließt die Lücke, dass `ManagerDeskHub` den Vorhang bisher ignorierte.
- Der lange tote Auto-Training-Pfad (`act1AssistantTrainingPlan`) ist wieder aktiv und braucht einen Story-Playtest.
- Narrative Abstiegszone und Sim stimmen überein: 17. Relegation, 18. direkter Abstieg.
