# /docs/prd/01_vision.md

**Version:** 1.1
**Last Updated:** 2026-09-29
**Status:** Final

---

## Purpose

Produktvision, Ton und Erzählregeln für FC Tycoon. Das Spiel verbindet eine
harte Fußball-Management-Simulation mit der menschlichen Geschichte eines
fiktionalen Underdog-Vereins und seiner lokalen Gemeinschaft.

Diese PRD definiert keine alternative Story-Simulation. Sport, Finanzen,
Transfers und Entwicklung erzeugen die Fakten; Figuren und Narrative machen
diese Fakten persönlich und verständlich.

---

## Produktversprechen

> Baue mit begrenzten Mitteln einen Underdog-Verein auf, ohne die Menschen zu
> verlieren, die ihn tragen.

Der Spieler führt nicht nur einen Kader. Er verantwortet einen lokalen Verein
mit Mitarbeitern, Nachwuchs, Fans, Traditionen und wirtschaftlichen Grenzen.
Erfolge fühlen sich verdient an, weil Niederlagen, Abstiege, Fehleinkäufe und
verlorene Talente echte Folgen haben.

Die Referenz ist das Zusammenspiel aus Fußball-Management und
Ensemble-Erzählung, wie es gute Fußball-Dokumentationen und Sportgeschichten
leisten. FC Tycoon übernimmt weder reale Clubs noch geschützte Figuren,
Handlungen, Namen, Dialoge oder visuelle Identitäten.

---

## Ton

Die Welt ist **nicht cozy**, aber menschlich:

- Fußball ist ungerecht, wirtschaftlich hart und gelegentlich absurd.
- Abstieg, Entlassung, Verletzungen und Abgänge werden nicht abgefedert.
- Gleichzeitig ist die Welt hell, humorvoll und voller lokaler Wärme.
- Humor entsteht aus Figuren, Ritualen und Situationen, nicht aus
  Slapstick oder der Lächerlichmachung kleiner Vereine.
- Hoffnung folgt aus Entscheidungen und Beziehungen, nicht aus einem
  garantierten Happy End.

Die Präsentation bleibt klar, farbig und icon-first. Emotion wird durch
Porträts, Reaktionen, Orte, Farben und kurze Dialoge getragen, nicht durch
lange Textwände.

---

## Die Underdog-Prämisse

Der Standardstart ist ein fiktionaler, lokal verwurzelter Verein mit:

- einem sportlich unterlegenen Profikader,
- engem Transfer- und Gehaltsbudget,
- einfacher, ausbaufähiger Infrastruktur,
- einer kleinen, loyalen Fanbasis,
- einer starken Akademie-Hoffnung,
- realem Abstiegs- und Jobrisiko.

„Underdog“ ist ein Startkonflikt, kein dauerhafter Statuseffekt. Aufstieg,
Wachstum und ein späteres Vereinsimperium entstehen vollständig aus den
bestehenden Simulationssystemen.

---

## Wiederkehrendes Ensemble

Story wird von stabilen Rollen getragen. Konkrete Namen, Porträts und
Eigenschaften dürfen pro Save variieren.

| Rolle | Perspektive | Systemquelle |
|---|---|---|
| Assistenztrainer | Taktik, Aufstellung, Risiko | F8.5; Qualität durch Staff-Attribute |
| Vorstand | Ziele, Finanzen, Jobdruck | F9.1–F9.2 |
| Kapitän | Kabine, Moral, Spielzeit | Spielerzustand und F1.7 |
| Jugendtrainer | Talente, Geduld, Abgangsrisiko | PRD 03 |
| Scout | Chancen und Unsicherheit | PRD 04 |
| Fanvertretung | Stimmung, Identität, Ticketpreise | F9.3 und Stadion/Fanbase |
| Lokaljournalist | Fragen, Hype, öffentliche Folgen | F9.4 und PRD 06 |
| Rivalen | Derby, Neid, gemeinsame Historie | F9.6 |

Figuren dürfen widersprechen. Sie dürfen aber nie Wissen besitzen, das ihr
System oder ihr Attributwert nicht hergibt. Ein schwacher Assistent liefert
vagere oder schlechtere Hinweise als ein starker.

---

## Story aus der Simulation

### Grundregel

Die Simulation ist die einzige Quelle der Wahrheit:

```text
Simulationszustand
  → typisiertes Ereignis
  → sichtbare Reaktion einer Figur oder Gruppe
  → optionale Managerentscheidung
  → deterministischer Systemeffekt
  → spätere Konsequenz und Rückbezug
```

Narrative darf Ergebnisse erklären, zuspitzen und erinnern. Sie darf keine
Tore, Transfers, Verletzungen, Beziehungen oder Zahlen erfinden, die nicht im
Savegame existieren.

### Drei Zeithorizonte

1. **Woche:** Kurze Reaktionen auf Spiel, Training, Transfer, Geld oder Jugend.
2. **Saison:** Ein Bogen wie Klassenerhalt, Aufstieg, Derby-Revanche oder
   Akademie-Durchbruch, ausschließlich aus realen Zuständen erkannt.
3. **Karriere:** Vereinschronik, wiederkehrende Rivalen, ehemalige Spieler und
   gemeinsam aufgebaute Orte gemäß F11.4–F11.6.

### Rückbezug statt Zufallstext

Gute Story erinnert sich. Spätere Meldungen beziehen sich auf gespeicherte
Ereignis-IDs und Zustände: ein gehaltenes Versprechen, eine frühere Niederlage,
einen Jugendspieler aus dem eigenen Intake oder einen riskanten Stadionausbau.

---

## Interaktion

- Entscheidungen bleiben kurz und icon-getrieben.
- Jede Antwort zeigt Haltung und erwartete Richtung, aber keine versteckten
  exakten Zahlen.
- Eine Storyentscheidung darf vorhandene Systeme wie Moral, Medienhype,
  Fanbase oder Vorstandsdruck beeinflussen.
- Story darf keine zweite Währung und kein separates „Story-Level“ einführen.
- Keine Entscheidung darf ein festes Spieler-Potential sichtbar machen.
- Jugendmannschaften bleiben vollautomatisch.

Narrative Karten konkurrieren um Aufmerksamkeit mit bestehenden
Managerentscheidungen. Belanglose Reaktionen sind Feed-Inhalte; nur
konsequenzreiche Situationen verlangen eine Antwort.

---

## Lokale KI

Ollama darf kurze Interviews, Reaktionen und Varianten formulieren.

Nicht verhandelbare Regeln:

1. Der Code bestimmt Ereignistyp, bekannte Fakten, erlaubte Aussagen und
   strukturierte Effekte vor dem Modellaufruf.
2. Das Modell formuliert, entscheidet aber keine Simulation.
3. Staff-Wissen und Staff-Qualität begrenzen den Prompt.
4. Jede Ausgabe hat ein kurzes, deterministisches Template-Fallback.
5. Generierte Varianten werden pro Ereignis gecacht.
6. Keine Cloud-LLM-API ohne ausdrückliche Produktentscheidung.

Damit bleiben Saves reproduzierbar und das Spiel ohne lokales Modell spielbar.

---

## Visuelle Identität

- Originaler fiktionaler Verein und originale Liga.
- Lokale Orte dürfen als statische 2D-Ansichten erscheinen: Stadionumfeld,
  Trainingsplatz, Vereinsheim, Straße oder Treffpunkt der Fans.
- Orte verändern sich sichtbar durch bestehende Ausbau- und
  Fanbase-Systeme.
- SVG und 2D-Iso bleiben Standard; kein 3D.

### Asset-Herkunft (verbindlich)

Keine generative Bild-KI (Midjourney, Stable Diffusion, DALL·E, img2img o. Ä.)
in ausgelieferten Spiel-Assets. UI nutzt handgeschriebene **SVG**, **CSS**,
Typografie, Emoji/Glyphs und Charts. Incident-Banner (Tor, Ecke, Elfmeter, …)
sind SVG mit Text — kein generiertes Artwork.

Stimmungs-Dekoration (Spieltag, Transferfenster) ist **optional** und darf durch
reine Text/CSS-Ambience ersetzt werden; keine neuen generierten PNG-Streifen.

Erlaubt: CC0-/Open-Source-Grafik und -SFX mit Quellenangabe im Repo.
Erlaubt später: **modulare Sprachaufnahmen des Entwicklers** (kein TTS).
Verboten ohne Produktentscheidung: Cloud-TTS, generative Musik, generative UI-Bilder.

LLM (Ollama) nur für **Text** nach den Regeln unter „Lokale KI“ — kein Ersatz
für Grafik oder Audio.

Vor öffentlichen Aussagen zu „kein KI-Content“: Inventur unter `/public/` und
Kommentare im Code (z. B. `img2img`) prüfen.

---

## Nicht-Ziele

- Keine Adaption oder Kopie eines realen Clubs, einer TV-Serie oder ihrer
  Figuren.
- Kein vorgegebenes Drehbuch, das Spielergebnisse überschreibt.
- Kein Roguelike- oder Meta-Progressionssystem.
- Kein spielbares Match, keine 3D-Sequenzen und keine **generative**
  Sprachsynthese (TTS).
- Kein Multiplayer.
- Keine private Lebenssimulation des Managers.
- Keine Cloud-KI als Voraussetzung.

---

## Priorität für den ersten Story-Slice

Der erste vollständige Bogen nutzt ausschließlich vorhandene oder bereits in
PRD 10 geplante Features:

**„Gemeinsam gegen den Abstieg“**

1. Der Vorstand setzt ein Klassenerhaltsziel.
2. Assistenztrainer und Kapitän reagieren auf Form und Kaderzustand.
3. Lokale Fans reagieren auf Ergebnisse, Ticketpreise und Einsatz.
4. Ein Journalist stellt kurze, icon-getriebene Fragen.
5. Reaktionen verändern nur bestehende Werte wie Moral, Fanbase,
   Medienhype und Vorstandsdruck.
6. Das Saisonende verweist auf konkrete Entscheidungen und Ergebnisse zurück.

Der Slice ist bestanden, wenn zwei Saves mit unterschiedlichen Saisonverläufen
erkennbar unterschiedliche Geschichten erzählen, ohne dass Narrative
Simulationsfakten erfindet.

---

## Invarianten

| Regel | Prüfung |
|---|---|
| Simulation bleibt Source of Truth | Jede sichtbare Aussage referenziert gespeicherten Zustand oder Event |
| Keine Story-only-Simulation | Text und Visualisierung lesen dieselben typisierten Ereignisse |
| Hinweise spiegeln Staff-Qualität | Gleicher Zustand, andere Staff-Skills → andere Präzision |
| Lokale KI optional | Vollständiger Spielfluss mit Template-Fallback |
| Konsequenzen bleiben real | Story verhindert keinen Abstieg, Abgang oder Jobverlust |
| Originale Identität | Keine übernommenen Club-, Figuren- oder Markenbestandteile |

---

## References

- Growth und Breakouts: PRD 02, PRD 06
- Jugend und Scouting: PRD 03, PRD 04
- UI-Regeln: PRD 09
- Feature-Scope: PRD 10, insbesondere F8.5, F9.1–F9.6 und F11.4–F11.6
- Finanzen: PRD 11
- Savegame und deterministische Events: PRD 08
- Club-Cockpit (Räume): PRD 14
- Keep/Refuse vs. Referenz-DNA: PRD 15
