# /docs/prd/15_feature_gap.md

**Version:** 1.6
**Last Updated:** 2026-10-03
**Status:** Final (Analyse — keine neuen Shipping-Features ohne Eintrag in PRD 10)

---

## Purpose

Abgleich der Referenz-DNA (EA Fußball Manager 2002, TCM 2003 Bonus-Skills,
FuMaFu-Handbuch, BMP 1992, FIFA Manager 11) mit dem verbindlichen Katalog
(PRD 10) und dem gebauten Stand (2026-09-29).

These: Die Underdog-Kampagne *ist* das RPG. Startinventar ist leer (Banden,
Trikotfläche, Wurstbude, blanke Spielerakte). Das Spiel füllt Slots über
Jahre. Das ist nicht FM11-Vollständigkeit und nicht ein zweiter Story-Mode.

Diese Datei erfindet keine Features zum Bauen. Lücken, die schon eine
Feature-ID haben, bleiben auf ihrem Meilenstein. Kandidaten ohne ID (C1, C2)
dürfen nicht in den Code, bevor PRD 07/10 sie aufnehmen.

---

## Scope

**In:** Keep/Refuse, Mapping auf F-IDs, gebaut-vs-Spec, Roadmap laut PRD 10,
Empfehlung der nächsten *bestehenden* IDs.

**Out:** UI-Räume (PRD 14). Formeln (PRD 02, 05, 11). Engine. Private
Lebenssimulation (PRD 01 Nicht-Ziele).

**Dependencies:** PRD 01, 05.4, 07, 10, 11, 13, 14.

---

## Design-Grundsätze

1. **Kampagne = leeres Inventar.** Underdog ist Startkonflikt (PRD 01), kein
   Statuseffekt. Fortschritt ist sichtbares Füllen von Ort und Spielern.
2. **Gifts nicht mischen.** 2002-Cockpit, 2003-Stamps, 2002-Match-Text,
   FM11-Büro, FuMaFu-Sofort-Effekt sind getrennte Gaben.
3. **Shirt-Sponsor ≠ Shirt-Verkauf.** Brustlogo/Banden = F6.5. Fanshop-SKU =
   F6.7. Nicht in einem System vermengen.
4. **Kein Feature ohne Katalog.** Was nicht in PRD 10 (oder Modul-PRD) steht,
   existiert nicht zum Implementieren.

---

## Specification

### 15.1 Drei Level-Spuren

| Spur | Inhalt | Katalog |
|---|---|---|
| Spieler | Wachstum, Fokus, später Stamps (C1) | F2.*, F1.5, C1 |
| Ort | Stadion, Banden, Trikot, Wurst, Merch | F7.*, F6.5, F6.7 |
| Leute | Ensemble, Post, Chronik; Blutlinie nur als später Beat (C2) | PRD 13, F9, F11, C2 |

Ein gutes Saisongefühl: zwei Banden verkauft, Wurststand mit Schlange,
Trainingsziel eines Jugendspielers fertig, Trikotdeal noch peinlich.

### 15.2 Keep / Refuse

| Nehmen | Quelle | Wohin |
|---|---|---|
| Squad/Akte/Post als Zuhause | 2002 | PRD 14 |
| Jugend als Report, zwei Entscheidungen | 2002, Gesetz 6 | F3.3, F3.4 |
| Einfacher Vertrags-Slider (Gehalt, Jahre, Bonus) | 2002 | F5.4 |
| Banden + Trikotfläche als sichtbare Slots | 2002 Bandenwerbung | F6.5, UI in 14.7 |
| Wurst/Bier/Imbiss als Ort | Economy-Säule; BMP/2002 | F7.3 (nicht FuMaFu-Skip) |
| Spend-bar → benannter Bonus inkl. Minus | 2003 + Wolfensberger | **C1**, blockiert |
| Office/Kalender/News-Ton | FM11 | Hub + Inbox, nicht 40 Attribute |
| Desk, leere Pokale als Hunger | BMP 1992 | F11.4 später; Stadion-Slots jetzt |
| Nachvollziehbarer Hebel | FuMaFu | gilt für Slider und Preise |
| Blutlinie in der Akademie nach Jahren | 2002-Lebens-RPG, *ohne* Haushalt | **C2**, blockiert |

| Nicht nehmen | Grund |
|---|---|
| Talent-Sterne / leere Sterne als Restpotenzial | Gesetz 1 |
| 40-Spalten-Identität, 3D-Köpfe | Gesetz 3 / 4, PRD 01 |
| Jugend-XI, Arcade-Talent-Loadout (FuMaFu max. 3 click-swap) | Gesetz 6; Stamps sind Identität, kein Weekly-Respec |
| Manager-Haus, Auto, Villa | PRD 01: keine private Lebenssimulation |
| Dating-Sim / Haushalts-Minispiel | dasselbe; C2 ist Intake-Tag, kein Sims |
| Kredite / Investoren | F6.6, Stack-Regel v1 |
| FuMaFu: Imbiss bewusst weglassen | widerspricht Economy-Säule |
| FM11-Sponsor-Klausel-Enzyklopädie | F6.5 ist Ort + Laufzeit, kein Juristen-Screen |
| Relatives 5-Sterne-Potential | Gesetz 1 |
| Match selbst spielen | F1.9 ist M3-Eingriff, nicht Identität |

### 15.3 Lücken mit bestehender Feature-ID

Priorität der *Empfehlung* ändert den Meilenstein in PRD 10 nicht. Ziehen nur
per explizitem Katalog-Edit.

| ID | M | Spec | Gebaut (2026-09-29) | Lücke |
|---|---|---|---|---|
| F5.4 | M2 | Gehalt, Prioritäten, Frust-Spirale (05.4) | Akte-Slider Gehalt/Jahre/Bonus + Frust; Jugend-Ein-Klick in Inbox | Dirichlet-Gewichte nicht auf Player — nur Advisor-Hint |
| F6.5 | M2 | Sponsor-Laufzeit, Erfolgsstaffel | Modal am Slot, zwei Staffeln | Klausel-Enzyklopädie bleibt raus |
| F6.7 | M3 | Merch × Popularität | — | Fanshop-SKU, nicht das Brustlogo |
| F6.4 | M1 | Wasserfall 11.5 | Icon-Balken + 13-Mo-Sparkline | — |
| F7.1 | M1 | 2D-Grundriss, Preise | Grundriss + Banden auf Tribünen + Shirt | Gelände-Tab separat |
| F7.2 | M2 | Kapazität, VIP, Heizung | Shop-Liste + Levels | Shop unter der Karte |
| F7.3 | M3 | Wurst, Fanshop, Hotel, Museum | Gelände-Raster + Palette | Sim/Hotel/Museum offen |
| F3.2 | M1 | Campus 2D-Iso | — | Grid statt Iso |
| F3.3 | M1 | YouthReports | Report 14.4 + Auto-Sim; Grid sekundär | Campus-Iso F3.2 |
| F3.4 | M1 | Icon-Inbox, Cap 4 | Post-Karte ●/▲, Jugend-Icons 03.4 | Hub-Ampel Jugend |
| F3.6 | M2 | Profi-Verträge, Spielzeit-Klauseln | Jugendvertrag-Default | Slider mit F5.4 teilen |
| F2.3 | M2 | Individualprogramme | Gruppen-Fokus F2.1 | kein Spend-to-Stamp |
| F2.7 | M1 | Wachstums-Heatmap | Hub 3▲/3▼; volle Zellen im Training | 09 Screen 1 |
| F4.3 | M2 | Scout-Netz 3 Tiers | Einstellungsliste | vorgezogen, keine Karte |
| F4.4 | M2 | Scout-Karte | — | |
| F1.5 | M1 | Profil Charts, Icons | Tabs + Flavor | Akte laut 14.3 |
| F5.1 | M1 | Markt, Fenster | Next-Action bei Fenster zu | Historie sekundär |
| F1.9 | M3 | Live-Eingriff | Pause/Speed | nicht vorziehen |

### 15.4 Kandidaten (nicht in PRD 10 — nicht bauen)

#### C1 — Fähigkeiten / Bonus-Stamps

- **Wunsch:** Sichtbare Stempel auf der Akte (`+2 Antritt`, `Geölter Blitz 1.0`),
  inkl. Minus, Spend-Bar (Fortschritt, Dauer, Effekt), max. wenige aktive
  Stamps. 2003-Schicht + Wolfensberger 2002.
- **Nicht:** FuMaFu-Wochen-Loadout gegen den Gegner; keine Restpotenzial-Sterne.
- **Blocker:** PRD 07 hat keine Stamp-Felder. Flavor in der UI ist Wallpaper.
  F2.3 deckt nur Weak Foot / Umschulung.
- **Freigabe:** Schema in PRD 07, neue ID in PRD 10 (Vorschlag `F2.8`, M2),
  `save_version` + Migration. Erst dann UI 14.3 füllen.
- **Wirkung:** Modifier auf sichtbare Attribute oder Match-Wrapper-Input —
  nie ein verstecktes `potential`.

#### C2 — Blutlinie in der Akademie

- **Wunsch:** Nach vielen Saisons taucht ein Intake mit Beziehungs-Tag auf
  (Kind einer Vereinsfigur oder des Managers als Karriere-Beat).
- **Nicht:** Partner finden, Haus kaufen, Autos, Dating.
- **Nähe:** `family_move` ist Abgangsrisiko (03.5), nicht Dynastie. F11.5 ist
  Ex-Profi als Staff, nicht Kind.
- **Freigabe:** Vorschlag `F11.8` oder Erweiterung F3.1, **M3**, ein Inbox-
  Item, deterministisch aus Save-Chronik. Kein neuer Sim-Layer.

### 15.5 Empfohlene nächste *Katalog*-Schritte

Ohne Meilensteine in PRD 10 zu verschieben:

1. **F6.5** — gezogen: Modal am Slot, Laufzeit, Wochenbetrag, zwei Staffeln.
   Klausel-Enzyklopädie bleibt raus.
2. Ein **F7.3-Slice** (eine Wurstbude) nur nach explizitem Katalog-Edit, der
   den Slice nach M2 zieht; sonst bleibt F7.3 M3. Empfohlen, nicht getan.
3. **C1 / C2** erst nach 07/10.

Shirt-Verkauf (F6.7) bleibt M3 und folgt der Bude, nicht dem Brustlogo.

### 15.6 Roadmap laut PRD 10 (unverändert)

Zählung und DoD sind die Source of Truth. Analyse verschiebt sie nicht.

| Meilenstein | Features | Fokus |
|---|---|---|
| **M1** | 36 | Kern-Loop: Sim, Liga, Growth, Intake, Basis-Transfers, Save |
| **M2** | 26 | USP: Scouting-Tiefe, Verträge, KI-Markt, Akademie-Stufen, Sponsoren |
| **M3** | 24 | Imperium, Events, Staff, Storylines, Merch, Nebengebäude |
| **M4** | 6 | Legacy & Meta |
| **Total** | **92** | plus `F-TYP-1` (Schema, zählt nicht) |

**M1-Definition of Done (PRD 10, wörtlich):** Ein Spieler kann einen Verein
führen, eine Saison simulieren (mit Auto-Matches), Jugendspieler hochziehen,
Talente entwickeln und Transfers tätigen — gespeichert in versioniertem
Savegame. Vorstand/Entlassung aktiv.

#### M1 — Kern-Loop

| ID | Feature | Hinweis Stand 2026-09-29 |
|---|---|---|
| F1.1–F1.5 | Aufstellung, Taktik-Presets, Auto-XI, Fitness, Profile | Rasen gut; Akte UI hinterher (14) |
| F2.1 F2.2 F2.7 | Training, Growth, Heatmap | Heatmap 09 Screen 1; Akte 14.3 |
| F3.1–F3.4 | Intake, Campus-Iso, Auto-Jugend, Inbox | Iso und Report-UI offen |
| F4.1 F4.2 | Marktliste, Wissensmodell | Balken + CI 14.9 |
| F5.1–F5.3 F5.7 | Markt, MW, Leihen, Vorvertrag | Next-Action 14.8 |
| F6.1–F6.4 | Budgets, Streams, Ledger, Wasserfall | Wasserfall 11.5 gebaut |
| F7.1 | Stadion 2D | Grundriss + Inventar-Hunger 14.7 |
| F8.1 | Trainer einstellen | vorhanden |
| F9.1 F9.2 | Ziele, Jobgefahr | Origin/Vorstand sichtbar |
| F10.1–F10.4 | Liga, Tabelle, Auf/Abstieg, KI-Growth | zwei Klassen |
| F11.1 F11.2 | Sommer-Check, Awards | Checkliste existiert |
| F12.1–F12.4 | Save, Seeds, Pacing, A11y | |

#### M2 — USPs (Wirtschaft + Tiefe)

F1.6–F1.8 · F2.3–F2.5 · F3.5–F3.8 · F4.3 F4.4 F4.7 F4.8 · **F5.4** F5.5 F5.6 ·
**F6.5** · F7.2 · F8.2 F8.3 · F9.3 F9.4 · F10.5 F10.6 · F11.3

Für die 2002-Kampagne sind **F5.4** und **F6.5** die wirtschaftlichen USPs,
nicht F10.6 (Cup).

#### M3 — Imperium

F1.9 · F2.6 · F4.5 F4.6 F4.9 · F5.8 · F6.6 (nur wenn Stack-Regel fällt) ·
**F6.7 F6.8** · **F7.3–F7.6 F7.8** · F8.4–F8.6 · F9.5 F9.6 · F10.7 ·
F11.4–F11.6 · F12.5

Bratwurst und Fanshop leben hier, solange 10 nicht editiert wird.

#### M4 — Legacy

F5.9 · F7.7 · F9.7 · F10.8 · F11.7 · F12.6

`13_meta.md` ist weiterhin ungeschrieben; Meta-Features nicht erfinden.

### 15.7 Bewusst nicht im Katalog (bleiben draußen)

Siehe PRD 10 Non-Features plus PRD 01 Nicht-Ziele. Ergänzend aus dieser
Analyse: Manager-Besitz (Haus/Auto), Dating, FuMaFu-Talent-Respec,
Stern-Potential, 3D, Match-als-Sportspiel.

---

## Invarianten

| Regel | Prüfung |
|---|---|
| Kein Code für C1/C2 | erst 07 + 10 |
| F6.5 ≠ F6.7 | Ort/Logo vs. SKU |
| F7.3 bleibt M3 | bis Katalog-Edit |
| Kein Haushalt | PRD 01 |
| Roadmap | nur PRD 10 verschiebt M |
| UI | PRD 14, nicht diese Datei |

---

## References

- Vision / Nicht-Ziele: PRD 01
- Verträge: PRD 05.4
- Player-Schema: PRD 07
- Katalog und Meilensteine: PRD 10
- Finanzen deferred: PRD 11 Scope-Out
- Story-Ensemble (Bratwurst-NPC): PRD 13
- Cockpit-UI: PRD 14
