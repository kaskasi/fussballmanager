# /docs/prd/28_press_conferences.md

**Version:** 0.1
**Last Updated:** 2026-10-29
**Status:** Draft — Säule „Press & Morale“ (PRD.md §5), erste spielbare Fassung

---

## Purpose

Pressekonferenzen machen aus der Säule „Press & Morale“ eine Entscheidung mit Folgen:
Was der Manager vor und nach besonderen Spielen sagt, bewegt die Moral der Kabine,
das Verhältnis zur Presse, den Medienrummel, den Vorstandsdruck und die Fans — und
die Moral wirkt (leicht) auf die Form in der Match-Engine.

Keine Pressekonferenz vor jedem Spiel: Sie kommt nur, wenn es etwas zu fragen gibt.

---

## Entscheidungen (Produkt, 2026-10-28/29)

| Thema | Entscheidung |
|---|---|
| Auslöser | Nächstes Spiel nach einem großen Transfer oder einer Investition, plus Schlüsselspiele |
| Großer Transfer | Ablöse ≥ Marktwert des drittwertvollsten Profis (mind. 150.000 €), rein oder raus, höchstens 4 Wochen alt |
| Investitionen | Jugendcamp/Satellit · Tribünen-Ausbau (Start und Eröffnung) · Stadion-Upgrades · Trainingsanlagen (Trainingsgelände, Trainingsplatz, Jugendplatz) · Akademie · Trikotsponsor · Namensrechte |
| Schlüsselspiel | Derby · Spitzenspiel (beide Top 3, ab Spieltag 8) · Kellerduell (beide nahe der Abstiegszone, ab Spieltag 8) · Saisonendspurt (letzte 3 Spieltage, eigener Verein oben oder unten dabei) |
| Zeitpunkt | Vor dem Spiel **nach** Aufstellung/Taktik, vor dem Anpfiff · nach dem Spielbericht, vor „Spieltag abschließen“ |
| Format | 2–3 Fragen, Antwort je Frage über einen Ton: ruhig · selbstbewusst · ausweichen · angriffslustig |
| Blockieren | Schritt im Spielablauf (Header-NEXT); „Assistent übernimmt“ jederzeit. Nicht geschaute Spiele / „Simulieren bis“: der Assistent übernimmt beide |
| Wer ist betroffen | Ganze Kabine leicht, der befragte Spieler stärker; Lob macht Positionskonkurrenten eifersüchtig |
| Weitere Werte | Presse-Verhältnis (neu), Medienrummel, Vorstandsdruck, Fans — keine Transfer-Nebenwirkungen |
| Match-Wirkung | Moral → Form-Offset in der Career→Engine-Brücke, höchstens ±0,5 Karriere-Form (≈ ±5 Engine-Form); Engine-Code unverändert |
| Text | Feste Vorlagen in de/en/zh-Hans; kein LLM-Aufruf (lokales Ollama später möglich, PRD 01) |

---

## Ablauf

```text
Aufstellung bestätigen ─► Pressekonferenz (vor dem Spiel) ─► Anpfiff ─► Spiel ─► Bericht
                                                                                  │
                 Spieltag abschließen ◄─ Pressekonferenz (nach dem Spiel) ◄───────┘
```

- **Vor dem Spiel:** Themen werden eingefroren (Transfer, Investition, Schlüsselspiel, ggf.
  Kabinen-Leak). Die Fragen dürfen die bestätigte Elf aufgreifen (Star auf der Bank, Jugendspieler
  in der Startelf). Die Moral-Änderung wird sofort in die Engine-Form der bestätigten Elf geschrieben.
- **Nach dem Spiel:** Ergebnisfrage (mit Spielstand), Nachfrage zum Thema (Debüt des Neuzugangs,
  Derby …), danach Spieler des Spiels oder — nach Niederlage bei Vorstandsdruck ≥ 50 — Jobfrage.
- **Header-NEXT:** „Antworten geben“ (erst aktiv, wenn alle Fragen beantwortet sind) → Wirkung
  sehen → „Anpfiff“ bzw. „Spieltag abschließen“. Kein zweiter Fortschritts-CTA (design.md §10).
- **Assistent:** Tonwahl folgt der Trainerqualität (AGENTS.md): ≥ 75 immer der beste Ton, ≥ 60
  meist, ≥ 48 jedes zweite Mal, darunter geraten — mit 20 % Fauxpas-Risiko.
- **Ein Paar pro Spiel:** Das Paar bleibt gespeichert (`post_done`), bis das nächste Spiel ein
  neues öffnet; die Wochen-Pipeline öffnet kein zweites Mal.

## Wirkung je Antwort (Basis)

| Ton | Kabine | Presse | Rummel | Vorstandsdruck | Fans |
|---|---|---|---|---|---|
| ruhig | +1 | +2 | 0 | −1 | 0 |
| selbstbewusst | +2 | +1 | +3 | +1 | +0,1 |
| ausweichen | +1 | −2 | −1 | 0 | 0 |
| angriffslustig | +2 | −5 | −2 | +2 | +0,3 |

Darauf kommen Lage-Modifikatoren (z. B. „selbstbewusst“ nach Niederlage = Realitätsverlust:
Kabine −3, Druck +2), Journalist (kritisch: weniger Goodwill; wohlgesonnen: Angriff kostet mehr)
und Spielerfragen (Lob +5, Konkurrenten −2; Schutz +3, Presse −1). Logik:
`src/press/press-conference.ts`.

---

## Krisen-Story-Beats (einmal pro Saison)

**Presse-Leiter** (Verhältnis 0–100, Start 55, ohne Kampagne +/−1 pro Woche Richtung 55):

| Schwelle | Folge | Beat / Entscheidung |
|---|---|---|
| < 30 | Hetzkampagne: Vorstandsdruck +1 und Fans −0,15 pro Woche, bis ≥ 35 | Aussitzen · Chefredaktion treffen (15.000 €, Presse +8) |
| < 25 | Die Kabine liest Zeitung: Moral −1 pro Woche | Zeitungsverbot (Kabine +3, Presse −3) · Offen ansprechen (Kabine +2) |
| < 20, Kampagne ≥ 3 Wochen | Vorstand stellt Ultimatum | Entschuldigung (Presse +15, Rummel −4, Kabine −2) · Medientraining (40.000 €, Presse +10) |
| < 12 | Boykott 4 Wochen: nur die wohlgesonnene Journalistin fragt (1 Frage) | Hinnehmen · Zurück-Boykott (Fans +0,4, Presse −4, +2 Wochen) |

Die bestehenden Presse-Beats (PRD 13) zahlen auf dasselbe Verhältnis ein: „Presse kritisieren“
−6, „Ehrlich zugeben“ +3, „Team schützen“ −1; Story mit der wohlgesonnenen Journalistin teilen +4;
nach dem Star-Verkauf „Neustart“ +1, „Finanzen erklären“ +2.

**Kabinen-Krise** (Ø Moral der Profis < 30):

| Wochen | Beat / Entscheidung |
|---|---|
| 2 | Mannschaftsrat: Zugeständnisse (Kabine +8, Druck +4) · Hart bleiben (Kabine −3, Druck −2) · Sündenbock (Kabine +6, schwächster Formspieler −20 und Wechselwunsch) |
| 2 | Assistent schlägt vor (Text nach Qualitätsstufe): Teamausflug (60.000 €, Kabine +3…+12 nach Qualität) · Freier Tag (Kabine +1…+6) |
| 4 | Leak an die Presse: Presse −4, nächste Pressekonferenz enthält die Kabinen-Frage (auch ohne Spiel-Anlass) |
| 4 | Wechselwünsche der zwei unzufriedensten Profis (`desire_to_leave`): Gespräch (Moral +6, Wunsch weg) · Ablehnen (Moral −4) |

---

## Match-Engine (ADR 0003)

Kein Engine-Eingriff: `careerEngineForm` in `shared/src/career-squad-bridge.ts` addiert
`moraleFormOffset(morale)` auf die Karriere-Form, bevor sie auf 0–100 skaliert wird. Neutral ist
Moral 65 (Weltgenerator 55–85), 100 erreicht +0,5, 30 und darunter −0,5. Gilt für eigene und
KI-Kader, Auto-Aufstellung und Aufstellungs-Board gleichermaßen.

Kalibrierung (`npm run calibrate:career -- --matchdays=12 --seeds=6`, 648 KI-Spiele): Tore
2,47 → 2,37 (Band 2,40–3,60), Schüsse 24,9 → 24,8, Remis 21,9 % → 24,8 %. Doppelter Ausschlag
(±1,0) liefert 2,35 Tore — keine Dosis-Wirkung, also RNG-Pfad-Rauschen; Band-Tests
(`football-feel.test.ts`) nutzen Engine-Kader und sind unberührt. Die Tor-Untergrenze ist schon
im Ausgangszustand knapp (3 Seeds: 2,59; 6 Seeds: 2,47) — nächste Kalibrierung beobachten.

---

## Persistenz

- `story_state.press`: `relationship`, `known_topic_ids` (erste Woche einer Karriere/eines alten
  Saves sät die Liste — vorhandene Anlagen lösen nichts aus), `conference` (aktuelles Paar),
  `history` (letzte 12), `boycott_until`, `campaign_since`, `leak_pending`.
- `story_state.morale_low_weeks`.
- Story-Inbox-Payloads speichern ihren Erkennungs-Kontext (`context`), damit lokalisierte Texte
  Namen und Stufen auch beim Rendern kennen.
- `SAVE_VERSION` 99, Migration `migration_099_press_conferences` (PRD 08.10).

---

## Code

| Teil | Datei |
|---|---|
| Zustand | `src/press/press-state.ts` |
| Auslöser | `src/press/press-triggers.ts` |
| Fragen, Wirkung, Assistent | `src/press/press-conference.ts` |
| Session/Pipeline | `src/press/press-session.ts` (`autoPreMatchPress` / `autoPostMatchPress` in `simulateGameWeek`) |
| Wochen-Tick, Krisen | `src/press/press-week.ts`, Beats in `src/narrative/detect.ts` / `render.ts` / `apply.ts` |
| UI | `src/match/PressConferenceStep.tsx`, `src/ui/design/surfaces/press.css`, Texte `src/i18n/press-display.ts` |
| Galerie | `?ui=gallery` → „Press conference“ |

## Offen

- Ollama-Varianten der Fragen/Antworten (lokal, PRD 01) mit Vorlagen als Fallback.
- Pokalspiele als Schlüsselspiele, sobald es Pokale gibt.
- Presse-Verhältnis im Hub sichtbar machen (heute nur in der Pressekonferenz).
