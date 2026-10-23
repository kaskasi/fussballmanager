# ADR 0004 — Spieltag Text-first, kein Live-Pitch

- Status: angenommen
- Datum: 2026-10-23

## Kontext

design.md §9.15 machte die SVG-Pitch-Viz zum Hero des Live-Spieltags (Commit 9fe8939 entfernte den Umschalter Pitch/Kommentar). Die Engine liefert aber nur einen Positions-Schnappschuss pro Event (ca. 1.600 pro Spiel, etwa alle 3,4 s Spielzeit). Was der Pitch dazwischen zeigt, ist interpoliert (Lerp) oder synthetisch erzeugt (Flug-Frames, Kompression, umgeschriebene Ball-Y). Eine glaubwürdige 2D-Ansicht bräuchte kontinuierliche Bewegung für 22 Spieler und den Ball. Das wäre praktisch eine zweite Engine: mehrere Wochen Arbeit mit hohem Risiko, und sie würde mit den höher gewichteten Säulen (Taktik, Transfers, Wirtschaft) konkurrieren.

PRD §2 sieht die Präsentation ohnehin „primarily through text“. FM-Puristen spielen im Textmodus.

## Entscheidung

1. **Der Live-Spieltag ist Text-first.** Der Kommentar-Stream ist der Hero. Daneben bleiben nur Visuals, die aus Events abgeleitet sind, nicht aus Positionen: Score-Kopf, Momentum-Balken (pro Minute, eigener Club vs. Gegner), Zonen-Leiste (Drittel und Seite), Live-Statistik und Tor-/Karten-Log.
2. **Highlight-Stufen wie im FM**, gespeichert pro Zuschauer:
   - Key: Tore, Karten, große Chancen, Wechsel
   - Extended: dazu alle Schüsse, Standards und Experten-Zeilen
   - Full: dazu Spielaufbau
   - Umsetzung: `MatchViewLine.level` (PRD 16)
3. **Der Pitch bleibt nur auf dem Aufstellungs-Screen** (`LineupPitch`, Drag & Drop, F1.1). Live-Pitch, Lerp und synthetische Präsentations-Frames werden entfernt.
4. `MatchView.frames[].dots` bleibt im Contract. Das kostet wenig und erlaubt später eine rohe Debug-Ansicht.

## Alternativen

- **Pitch reparieren (Bewegungsmodell, Choreograf):** mehrere Wochen Arbeit mit hohem Risiko, dass es unheimlich aussieht. Verworfen.
- **Text als Standard, Pitch per Umschalter:** Die Pflege von Lerp und Synthetik bliebe bestehen. Verworfen.
- **Reiner Text ohne Visuals:** widerspricht AGENTS.md („text default, not text-only“). Momentum und Zonen sind ehrlich, weil sie aus Events kommen. Verworfen.

## Konsequenzen

- Glaubwürdigkeit hängt jetzt an Event-Statistik und Copy, nicht an Positionen. Deshalb gilt ADR 0003 (Kalibrierung) als Voraussetzung.
- Der Director muss für die Stufe Full Aufbau-Zeilen liefern und braucht deutlich mehr Template-Varianten (PRD 16).
- design.md §9.15, PRD 14.10 und PRD 16 (B3d) sind angepasst.
