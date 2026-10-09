# /docs/prd/14_ui_cockpit.md

**Version:** 1.17
**Last Updated:** 2026-10-07
**Status:** Final (Darstellung — kein Code in diesem Dokument)

---

## Purpose

Club-Cockpit für The Club: Räume statt Admin-Shell. Die Simulation ist weiter
als die Screens (Stand 2026-09-29). Diese PRD legt fest, wie gebaute Systeme
*aussehen*, damit Feature-Stand und UI-Stand wieder zusammenfallen.

PRD 09 bleibt die Inventarliste der acht Pipeline-Screens. PRD 14 gewinnt bei
Dichte, Icon-First und „kein Dead-End“. Widerspricht eine Pipeline-Ansicht
dieser PRD (12-Spalten-Tabelle als Hauptansicht, Text-Buttons `accept` /
`ambitious`, leere SaaS-Tabs), gilt 14.

**design.md** (`docs/prd/design.md`) definiert die umgesetzte visuelle Sprache (Tokens, Header, §9-Wireframes). Referenzbilder: `docs/design-refs/`, FM2001: `fmscreens/fm2001/`. Bei Konflikt Tokens/Header/Gelb-Regel vs. ältere Cockpit-Skizzen in 14 gilt design.md.

Referenz-DNA (nicht 1:1 kopieren): EA Fußball Manager 2002 (Cockpit,
Stadion-als-Ort, Spielerakte, Jugend-Report), FIFA Manager 11 (Büro als Ort,
Kalender, News), nicht die 40-Spalten-Identität.

---

## Scope

**In:**

- Alle Club-Räume: Hub, Inbox, Spielerakte, Jugend-Report, Scouting,
  Transfers, Finanzen, Stadion, Liga, Aufstellung.
- Match-*Präsentation* (Textlog + 2D-Spielfeld), nicht die Engine
  (`server/src/engine/` bleibt Gesetz 4). Beat-Taxonomie und Director: PRD 16.
- Leere Inventar-Slots als Hunger (Banden, Wurstbude), auch bevor F6.5 / F7.3
  simuliert sind — füllen darf nur das jeweilige Feature.

**Out:**

- Neue Simulationsregeln. Die stehen in PRD 02–08, 11–13 und 15.
- Mechanische Fähigkeiten-Stamps, Shirt-/Banden-Verträge, Wurst-Ökonomie,
  Manager-Haushalt. Mapping und Verbote: PRD 15.
- Neue Component-Library als erstes Deliverable. Erst Räume, dann Tokens.
- 3D, generative Bild-KI, relatives Potential, FM11-Enzyklopädie.

**Dependencies:** PRD 01, 03.3–03.4, 09, 10, 11.5, 13, 15, 17.

---

## Design-Grundsätze

1. **Raum vor Shell.** Jeder Screen ist ein Ort im Verein (Akte, Briefkasten,
   Stadion, Rasen), kein Dashboard-Produkt.
2. **Dichte vor Politur.** 2002 war voll und unschön. FM11 war voll und schön.
   Leere Mint-Fläche mit einer KPI-Kachel ist hinter beiden.
3. **Datenleer ≠ möbelleer.** Woche 1 darf 0:0 und leeres Ledger zeigen.
   Sie darf keine Räume ohne nächste Aktion und keine Jugend ohne Report-Möbel
   zeigen.
4. **Icon/Visual First, 2 Klicks, kein Dead-End** — unverändert aus PRD 09.3.
   Inbox-Aktionen sind Icons, keine englischen Text-Buttons.
5. **Anzeigesprache (F12.8).** Default DE; EN und 简体 wählbar in Opening Schritt 1
   und ⋮ → Anzeige. Spieler- und Vereinsnamen in der Welt bleiben generiert (nicht
   übersetzt). Englische Chrome-Reste (`accept`, `Play`) sind Fehler.
6. **Zwei Sprachen, ein Strom.** Match-Text und 2D-Spielfeld lesen dieselben
   Events. Der Club-Chrome setzt nicht den Ton des Spieltages, der Log nicht
   den Ton der Akte.
7. **Leere Slots sind Hunger.** Offene Banden, fehlende Wurstbude, leere
   Stamp-Zeile — sichtbar, nicht weggelassen. Füllen ist Feature, nicht Deko.
8. **Kern Browser/Deck, Mobile nicht vergessen.** Cockpit und Match-UI gelten
   zuerst für **Desktop-Browser** und **Steam Deck** (PRD 17). Layout und
   Interaktion trotzdem **mobile-tauglich** bauen (eine Spalte, große Tap-Ziele,
   lesbare Dichte auf schmalen Screens) — für Tester unterwegs und spätere
   Monetarisierung, ohne den PC-Kern zu verwässern.

---

## Specification

### 14.1 Diagnose (Stand 2026-09-29)

| Raum | Feature-Stand | UI-Stand | Soll-Raum |
|---|---|---|---|
| Aufstellung | F1.1–F1.3 da | Bild, trifft 14 | behalten |
| Stadion-Grundriss | F7.1 + Ticket-Stepper | Ringe + Hunger-Slots | behalten |
| Origin-Modal | PRD 13 | drei Karten, gut | behalten |
| Scouting-Wissen | F4.2 | Balken + CI-Grauzone | behalten |
| Training-Heatmap | F2.7 / 02.1 | Team-Raster ~3×8/Stufe (1□=1 Spieler, ~8px); Hover Desktop, große Zellen Mobile | behalten |
| Fähigkeiten-Stamps | F2.8 / 07.5 | Hunger-Slots → echte Badges aus `Player.stamps` | füllen |
| Spielerakte | CA, Vertrag, Flavor | vier SaaS-Tabs, ein Punkt | eine Karte |
| Jugend | Roster + Auto-Sim | 12-Spalten-Grid | Report (PRD 03.3) |
| Inbox | Slice + Cap 4 | Modal, Text-Buttons | Karte + Icons (09.2 / 03.4) |
| Finanzen | F6.1–F6.4 da | Wasserfall 11.5 | behalten |
| Transfers | Fee-Runden im Code | Next-Action-Streifen | behalten |
| Match-Log | Event-Stream | englisches Terminal | DE, Namen in der Zeile |

Systeme ≈ M1.5. UI-Seele ≈ M0.7. Politur bereits zu hoch für die Seele.

### 14.2 Screen-Landkarte (Club-Cockpit)

Ergänzt PRD 09.1, ersetzt sie nicht.

```text
Club-Cockpit
├─ Hub (Kalender-Streifen + Kacheln, keine KPI-Wüste)
│  ├─ Inbox / Post (max 4, PRD 03.4 + 13)
│  ├─ Trainingswoche 3▲ / 3▼ + kleine Pipeline-Karte
│  └─ Origin nur Woche 1 (PRD 13)
├─ Kader
│  ├─ Aufstellung / Rasen          ← schon auf Zielniveau
│  └─ Spielerakte (eine Karte, Tabs nur als Vertiefung)
├─ Pipeline (PRD 09 Screens 1–3)
│  ├─ Training-Übersicht + Heatmap
│  ├─ Jugend-Report (nicht Grid-first)
│  └─ Scouting (Wissen-Balken, später Karte F4.4)
├─ Verein
│  ├─ Finanzen (Wasserfall 11.5)
│  ├─ Stadion (Grundriss + Inventar-Slots)
│  └─ Transfers (nächste Aktion auch bei geschlossenem Fenster)
├─ Wettbewerb
│  └─ Tabelle / Form (F10.2)
├─ Hilfe (F12.7)
│  ├─ Welt & Story (PRD 01)
│  ├─ So funktioniert's
│  └─ Fähigkeiten / Stempel (F2.8 Katalog)
└─ Spieltag
   ├─ Ereignisse (DE, Namen in der Zeile)
   └─ Spielfeld (2D, gleicher Stream)
```

Icon-Leiste oben bleibt (2002-Hauptmenü-Grammatik). Sie sitzt auf Club-Ort,
nicht auf Startup-Weiß ohne Inhalt.

### 14.3 Spielerakte (F1.5, Vertiefung F2 / F5.4)

Eine Karte. Tabs sind sekundär (Verlauf, Saisonwerte), nicht die Identität.

```text
/** WIREFRAME: PRD 14.3 — Spielerakte */

┌──────────────────────────────────────────────────────────────┐
│ Felix Schröder · CB · 17 · 🇩🇪                               │
│ CA 87  ● Fit  ◆ Form  ● Moral  📚 Erfahrung · Roh            │
├──────────────────┬───────────────────────────────────────────┤
│ Kernattribute    │ Aktuelles Ziel                            │
│   ◇ SVG-Hex (6)  │ 🏃 Schnelligkeit                          │
│   ░ footnote bars│ ▓▓▓▓░░░░ 32 % · 0.8 J. · Effekt sichtbar │
│ Technik / Physis │                                           │
│ Mental (+ TW)    │ Fähigkeiten / Bonus (F2.8)                │
│ ⚑ Gate-Keys      │ [Kopfballungeheuer] [· dashed hybrid ·]   │
│ Stärke als…      │ max 3 Badges · Klick = Quelle + applied   │
│ TW ░  IV ▓▓▓     │ Vertrag                                   │
│                  │ Jugend · € 80/Wo · bis Saison 2029        │
│                  │ [✍️ Verhandeln]  [⬆️ Profikader]          │
└──────────────────┴───────────────────────────────────────────┘
```

Regeln:

- Flavor-Text (`Ruhiges Auftreten…`) ist sekundär, Tooltip oder eine Zeile.
  Mechanische Stamps kommen aus `Player.stamps` (PRD 07.5 / F2.8). Flavor
  `history.career_stamps` darf die Slots nicht als echte Boni füllen.
- Fähigkeiten-Slots: bis zu 3 aktive Badge-Icons. Leere Slots bleiben
  Hunger (Underdog-Start). Stamp-Training startet über Individualprogramm
  (F2.3-Slot + `kind: "stamp"`).
- Kernattribute: 6-Achsen-SVG-Hex (dieselben Keys wie `profileAttributeKeys`).
  Eigene Spieler: gefülltes Polygon. Scouts: CI-Band (innerer/äußerer Ring),
  kein exaktes Polygon. Dünne Balken darunter sind Fußnote, nicht Held.
  Darunter die volle Skill-Liste gruppiert Technik / Physis / Mental
  (plus TW-Handling / schwaches Bein). Stamp-Gate-Keys (z. B. Stärke +
  Stellung für Kopfballungeheuer) tragen eine Markierung. Kein siebtes
  „Potential“-Achs (Gesetz 1). Kein `heading`-Attribut.
- Hybrid-Unlock (noch nicht gesiegelt) = gestrichelter Hunger-Slot, Klick
  startet das F2.3-Siegel-Programm.
- `Stärke als…` vier grobe Balken aus Positions-Proficiency (PRD 07
  `flexibility` + Primärposition). Die gruppierte Skill-Liste ist die
  Attribut-Enzyklopädie, nicht eine zweite Positionsmatrix.
- Vertrag-Spalte zeigt Status. ✍️ Verhandeln öffnet ein Modal (Gehalt,
  Jahre, Bonus, Minuten-Garantie, Startplatz). Jugend und Profis derselbe
  Dialog. Inbox-Jugendvertrag bleibt Ein-Klick-Default.
- Nach drei Fehlangeboten: Spieler ist sauer und redet erst mal nicht.
  Danach, mit `desire_to_leave`: will zu einem größeren Verein. Nach
  Unterschrift: hat gerade neu unterzeichnet. Keine Tageszahl in der UI.
- Saison-Zahlen in der UI sind Kalenderjahre (2026 + abgeschlossene
  Saisons), nicht `Saison 1`.
- Entwicklungschart ohne zweite Saison: Sparkline oder „Saison 2026, Start“,
  kein leeres Plot mit einem Punkt als Heldenfläche.

### 14.4 Jugend-Report (F3.2, F3.3, Gesetz 6)

Kein XI, keine 12-Spalten-Hauptansicht. Report laut PRD 03.3, Entscheidungen
laut 03.4.

```text
/** WIREFRAME: PRD 14.4 — Jugend-Report */

┌──────────────────────────────────────────────────────────────┐
│ Jugend · U17 Report KW 1                                     │
│ 🏫 Campus-Stufe 1 · 🚀 2  ➡️ 11  ⚠️ 1  😞 0                  │
│ Noch kein Spiel — Möbel trotzdem da                          │
├──────────────────────────────────────────────────────────────┤
│ Name        Pos  CA  Ziel            Fortschritt  Status     │
│ Wolf, J.    GK   65  💪 Physis       ▓▓░░  —      ✍️ fällig  │
│ …           …    …   🚀 / ➡️ / ⚠️                     📅 07.03│
├──────────────────────────────────────────────────────────────┤
│ [🔄] [⬆️] [✍️] [💪]   ← Icons, Badge-Drop (PRD 03.4)        │
└──────────────────────────────────────────────────────────────┘
```

Das Grid darf als *sekundäre* Jahrgangs-Ansicht (09 Screen 2a) existieren,
nicht als erster Eindruck. Campus-Tab (F3.2) ist das Stufen-Grid plus Camps;
der Report bleibt die Heimat.

### 14.5 Inbox und Hub (F3.4, PRD 13)

```text
/** WIREFRAME: PRD 14.5 — Post */

┌─────────────────────────────────────────────┐
│ Post · 1/4                                  │
│ 📋 Vorstand · Klassenerhalt                 │
│ Der Fanrat erwartet keinen Wunder.          │
│                                             │
│ [● Überleben]   [▲ Anspruch]                │
│ Form + Farbe (09.3). Kein "accept".         │
└─────────────────────────────────────────────┘
```

Origin-Modal: zuerst **Wie heißt du?** (kein Default-Jan), dann Losgewinn /
Brief / Gemeinschaft plus Kapitän. Hub-Kacheln tragen
einen Satz plus Ampel, wie PRD 09 Screen 1 — nicht drei leere Statuszeilen
und ein Modal darüber.

### 14.6 Finanzen (F6.4 / PRD 11.5)

Wireframe in PRD 11.5 ist verbindlich. Woche 1: Wasserfall mit *dieser*
Woche (Sponsoring, Gehälter, Unterhalt), nicht „Noch keine Buchungen“ als
leere Kachel, wenn der Wochenabschluss bereits bucht. Sparkline darf flach
sein. Drei Tiles allein reichen nicht — Imbiss, Stadion und Runway sitzen
unter dem Wasserfall, plus kategorisierter Ein/Aus-Graph (Matchday,
Operations, Gehälter, Transfers, Ausbau). Kapital ≥ €100k (oder eine
Gehaltswoche) öffnet das Runway-Sheet; Vorstand-Kasse warnen, nicht
blocken. Gelände-Erweiterung kostet €320k.

**Merchandising (F6.x Slice, save ≥ 79):**

- **Team-Menü → Merchandising** — Steuerung: Trikot-Top-Verkäufer (Marktwert-Gewichte),
  Kollektion-Mix (Schals/Textil/Heim), ein Liefervertrag (Budget/Standard/Oeko) + Retail-Modus;
  Lieferwechsel = Infrastructure-Ledger, wirkt ab Folgewoche.
  **Lager bleibt:** SKU-Bestände, Bulk-Markt, On-Demand-Lieferung und Firesale — Ausbau
  (Fanshop-Level, Kapazität, Einkauf) ist Teil des Loops, keine reine Durchsatz-Simulation.
  **Sale-Ende:** Kurz-Zusammenfassung (Stück, Umsatz, Gewinn/Verlust) als Modal + Club-Mail.
  **Überfüllung > 4 Wochen:** Mitarbeiter entsorgen Überschuss (Buchwert-Verlust) + Mail.
  **Lager Stufe 1:** Kapazität ≈ **8 Wochen** Referenz-Absatz bei vollem Bestand; Neustart **~25 %** gefüllt
  (`merchandising-baseline.ts` / Fanshop-Stufe 1).
- **Finanzen → Tab Merch** — nur Auswertung (wie Eintritt): Wochen-/Voll-netto, Top-Trikots,
  Mix; keine zweite Fortschritts-CTA im Tab (design.md §10).
- Übersicht: Budget-Karte „Merchandising“ neben Kasse/Transfer/Gehalt.

### 14.7 Stadion als Inventar (F7.1, F6.5, Gelände-Tab)

Den bestehenden 2D-Grundriss behalten. Ausbau-Shop darf nicht die Karte
verdrängen. Tabs: **Grundriss** · **Gelände** · Ausbau.

```text
/** WIREFRAME: PRD 14.7 — Stadion */

  [Grundriss] [Gelände] [Ausbau]

  Grundriss: Banden sitzen auf den *Tribünen-Karten* um den Plan,
  nicht auf dem Rasen. Klick ▭ = Sponsor-Modal (F6.5).
  Lucide Shirt — Brustlogo-Slot neben dem Plan.

  Gelände: 18×12. Stadion fest (4×2). Start-Kern 10×10 owned (zentriert),
  Straße von der Stadt zur Arena. **Seiten-Erweiterungen:** vier kaufliche 2×6-Plättchen
  links/rechts (abwechselnd oben/unten) à €320k — volle Breite = 18 Spalten.
  Gebäude = Rechteck (Mindestgröße), Kante wachsen/schrumpfen, zurück auf min.
  Stadtanschluss außerhalb oben. Straße ziehen (Sim City): verbindet sich
  automatisch. Gebäude ohne Netz (inkl. Arena) tragen Warn-Icon wie die Bushaltestelle;
  Klick legt den Weg zur Autobahn.
  Bude (n) · Park (n) · Rest einmal, aber skalierbar.
  Layout: Palette + Effekt-Rail oben bündig mit erster Grid-Zeile; Detail-/CTA-Zeile
  unter dem Board (Hotel/Restaurant-Live-Stats bei Auswahl).
  **Später (deferred):** zweites Campus-Gelände / separater Precinct — eigener Slice,
  kein v1-Scope; Erweiterungs-Kauf bleibt das v1-Landmodell.
```

- Pro Stand sichtbare Werbe-Slots **auf den Karten** um den Grundriss
  (leer = Hunger, belegt = Marke). Nicht auf dem Rasen zeichnen.
  **Steh-/Sitz-Ausbau** schaltet extra Banden frei (Nord/Süd C+D, West/Ost B).
- F6.5-Modal: Marken-Chips (exklusiv), Laufzeit-Slider, Wochenbetrag-Slider,
  zwei Erfolgsstaffeln (Torschützenkönig / Meister, je +€ 1 Mio.).
  Die Marke sagt auch Nein. Keine Klausel-Enzyklopädie.
- Gelände-v2 (F7.3-Möbel, kein 3D): Patches mit Mindestgröße (z. B. Trainingsplatz
  2×3, Gelände 3×3, Park 2×2). **Mehrfach nur** Würstchenbude und Parkplatz.
  Effekt folgt belegter Fläche, und nur wenn das Gebäude am Straßennetz hängt.
  Start-Kern ist 10×10 owned (innerhalb 18×12), mit Straße von der Autobahn (oben
  außen) zur Arena — wer daneben baut ohne Netz, verschenkt Buffs (⚠️).
  Seitenfläche wird **stückweise gekauft** (2×6-Plättchen, €320k, Reihenfolge
  alternierend links/rechts); volles Board = 18×12 nach vier Käufen.
  Straße ziehen wie in Sim City — benachbarte Zellen verbinden sich zum Netz.
  Stadtanschluss sitzt außerhalb oben (Autobahn).
  Jedes Gebäude und die Arena docken an das Straßennetz — direkt an die Autobahn
  oder über eine verbundene Straße dorthin. Isolierte Straßen zählen nicht.
  Ohne Netz: gelbes ⚠️ (wie die Bushaltestelle); Buffs sind tot, bis die Straße
  anschließt. Klick mit dem Straßen-Werkzeug auf ⚠️ legt den Weg.
  Patches wachsen an jeder Kante und lassen sich auf die Mindestgröße
  zurückziehen (sonst ist Umsetzen nach dem Ausbau unmöglich).
  Fanshop und Trainingszentrum haben weiter Qualitäts-Level (Shop / Halle /
  Fitness / Pool / Physio). 1×1-Parzellen bleiben als Haken für späteres Deko
  (Baum, Bank) ohne Buff — Landkauf ist 2×6-Plättchen (nicht 1×1).
  Imbiss (Bude/Zelt) und Fanshop: **Durchsatz × Besucher × Fanbasis-Faktor**.
  Heimspiel nutzt Ticket-Fill; Auswärts/Midweek `precinctAwayWeekCommerceFill`
  (Fanbasis + **Bus + Fan-Service** = organisierte Auswärtsfahrten). Shop-Level
  erhöht Durchsatz, kein hartes Umsatz-Cap. **Training:** Campus gibt keine
  Growth-Multiplikatoren mehr — Halle = Unlock, Fitness/Pool/Physio = Regen.
  Hotel und Restaurant (einmal, docked-only) zahlen über **Auslastung**, nicht
  über Training: Hotel steigt in Heimspiel-Wochen mit der Fanbasis des Gasts;
  Restaurant mit der eigenen Fanbasis, Story kann 12 Wochen 100% pinnen.
  Trainingszentrum: Halle bufft Training; Fitness, Pool, Physio buffen
  Fitness-Regen und Müdigkeit (Physio senkt Verletzungsrisiko leicht).
  Trainingsplatz ist extra Rasen. Beide buffen Training.
- Ticket-Stepper an Blöcken bleibt.

### 14.8 Transfers (F5.1, F5.4, F5.7)

Kein Dead-End bei geschlossenem Fenster. Oben **Vertragsgespräche**:
max. drei Profis mit Restlaufzeit **unter zwölf Monaten** (kürzeste zuerst);
Klick → Akte / Verhandeln (F5.4). Scouting-Markt und Vorverträge bleiben
im Scouting-Screen. **Historie** nur eigener Verein: zwei Spalten Zugänge | Abgänge,
Saison-Pills (Chevrons bei vielen Jahren). **Liga-Deals** nicht auf diesem
Screen — siehe Dienstags-Kicker (PRD 09). Fee-Verhandlung bleibt im
bestehenden Flow; Spielergehalt-Slider ist F5.4 und teilt die Akte (14.3).

### 14.9 Scouting (F4.1, F4.2; Karte F4.4 M2)

Kopfzeile laut PRD 09 Screen 3 behalten (`Gut bekannt / Unklar / Unbekannt`).
Zeile: Portrait, Name, zwei Balken, CI als Grauzone — nicht nur `58–86` als
Text. Leerer Filter ist ehrlich; Chip **Filter zurücksetzen**.
Scout-Netzwerk als Einstellungsliste ist bis F4.4 akzeptabel; es ist ein
Shop, keine Karte.

### 14.10 Spieltag (Präsentation, Gesetz 4)

```text
/** WIREFRAME: PRD 14.10 — Spieltag */

  NOR 0–0 HEI · 12' · Ballbesitz · Ecken
  [Ereignisse] [Spielfeld]   Tempo 1×

  12' Karim Gärtner gewinnt den Zweikampf gegen Samir Böttcher.
       └ Namen in der Zeile farblich = XI-Index (2002-Grammatik)

  NOR XI (live)          HEI XI
  16 Becker   ← aktiv    5  Gärtner ← aktiv
```

- Dieselbe Event-Quelle für Log und 2D-Pitch.
- Später: Broadcast Director (PRD 16) — Beats, PBP/Color; heute 1:1-Templates.
- Deutsch. Kein englisches Terminal als Default.
- Live-Eingriff (F1.9) bleibt M3; Speed/Pause sind Pacing, kein Mitspielen.
- Matchday-Text-Editor-DNA des parallelen Projekts nicht den Club-Chrome
  überschreiben lassen.

### 14.11 Liga (F10.2)

Tabelle darf in KW 1 voller Nullen sein. Form-Sparklines und Torschützen-
Kacheln brauchen Möbel (leere Galerie mit Icon), nicht drei Caption-Zeilen
„Noch keine Daten“ ohne Ort.

### 14.12 Reihenfolge der UI-Arbeit (kein Code hier)

Ein Raum pro Task, Pipeline-Features nicht nebenbei umbauen.

1. Spielerakte (14.3) — größte Lücke Seele vs. System. **gebaut**
2. Jugend-Report (14.4) — Gesetz 6 sichtbar machen. **gebaut**
3. Inbox-Icons + Hub (14.5). **gebaut**
4. Finanzen-Wasserfall (14.6) — Spec existiert. **gebaut**
5. Stadion-Inventar-Slots (14.7) — Hunger zeichnen, Sim später. **gebaut**
6. Transfers ohne Dead-End (14.8). **gebaut**
7. Match-DE + Namen in der Zeile (14.10).
8. Scouting-Balken (14.9). **gebaut**
9. Training-Heatmap (F2.7): Team-Pixelbar im Hub + Training (1 Quadrat = 1 Spieler). **gebaut**

Politur (Abstände, Mint, neue Tokens) ist nachrangig, solange ein Raum noch
Admin-Shell ist.

### 14.13 Career curtain (PRD 19)

Cockpit-Dichte gilt **pro Phase**. Act 1 ist bewusst leerer — nicht weniger
„Spiel“, sondern weniger Navigationslast.

```text
/** WIREFRAME: PRD 14.13 — ⋮ TEAM menu by phase */

act1_nordstern:
  Pipeline · Postfach · Kader · Training* · Jugend · Kalender · Ligen · Hilfe
  *Training screen: assistant banner, slots filled, no neglect block from empty plan

act2_regional (incremental):
  + Stadion (beat) · Scouting (beat) · Finanzen (beat) · Transfers (beat)

full / act3_empire:
  Full TEAM list per design.md §6
```

Hub **STATUS**-Kacheln: in Act 1 nur Training (auto label), Youth, Scouting chip
hidden or „—“; Loans/Transfers chips suppressed. Chronicle and Board stay —
story spine visible.

Icon-first onboarding panel (post-opening): one card, Lucide `Play` or calendar
glyph, copy „Woche mit NEXT voranbringen“ — kein zweiter gelber CTA im Content.

### 14.14 Act 4 endgame shell (PRD 21)

**VictoryEndScreen:** Outside club shell (no header-NEXT). Dark or sand full bleed;
trophy icon; one chronicle headline; primary CTA unlocks Elite World path.

**TitleCareerSelect:** First **title hub** most players see only after completing
Act 3. Two large cards (icon-first): underdog vs elite. Elite card uses denser
typography (`manager_desk`). Saves slot list secondary.

**EliteWorldSetup:** Wizard inside normal shell once elite career starts — table-
heavy club/league picker; no Nordstern cast in fan feed.

---

## Invarianten

| Regel | Prüfung |
|---|---|
| 09.3 gilt | Icons, 2 Klicks, Next-Action, Form+Farbe |
| Gesetz 3 | Keine Text-first Inbox, kein Grid-first Jugend |
| Gesetz 6 | Keine Jugend-XI |
| Gesetz 1 | Keine Talent-Sterne, keine Potential-Leiste |
| Gesetz 4 | Keine Engine-Änderung fürs Log |
| PRD 01 | Keine Manager-Wohnung als Screen |
| Leere Slots | Hunger sichtbar, nicht weggelassen |
| Deutsch | Club + Kommentarzeilen |

---

## References

- Vision und Nicht-Ziele: PRD 01
- Jugend-Report und Inbox: PRD 03.3, 03.4
- Pipeline-Screens: PRD 09
- Feature-IDs: PRD 10
- Finanz-Wireframe: PRD 11.5
- Story-Surfaces: PRD 13
- Keep/Refuse und Feature-Lücken: PRD 15
- Career acts: PRD 19
- Match-Präsentation vs Engine: `docs/match-presentation-blockers.md`
