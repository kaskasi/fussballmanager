# /docs/prd/12_league_world.md

**Version:** 1.1
**Last Updated:** 2026-10-03
**Status:** Final (M1: zwei Spielklassen und prozedurale Welt)

---

## Purpose

Liga- und Weltstruktur für neue Karrieren definieren. Jeder Save erhält eine
eigene, deterministisch erzeugte Fußballwelt. Dieselbe Seed erzeugt dieselbe
Welt; eine andere Seed erzeugt andere Clubs, Spieler, Kaderstärken und
Scouting-Ziele.

Das Ziel ist echte Entdeckung statt Wiedererkennen eines fest eingebauten
Demo-Datensatzes.

---

## Scope

**In (M1):**

- zwei Spielklassen mit je 18 Clubs,
- 34 Ligaspieltage pro Club als Hin- und Rückrunde,
- fiktionale Club- und Spieleridentitäten,
- prozedural erzeugte Profikader für Spieler- und KI-Clubs,
- persistierte Welt und reproduzierbare Seeds,
- Aufstieg, Abstieg und Relegation,
- Scouting-Markt aus den tatsächlich erzeugten Weltkadern,
- Mapping der Karriere-Spieler in den bestehenden Match-Engine-Wrapper.

**Out:**

- reale Clubs, Spieler, Ligen oder Lizenzdaten,
- dritte Spielklasse und weitere Länder (F10.8, M4),
- internationale Wettbewerbe (F10.6),
- Nationalmannschaften (F10.7),
- dynamisch neu erzeugte Welt beim Laden eines Saves,
- Änderungen unter `server/src/engine/`.

**Dependencies:** PRD 01, PRD 02, PRD 04, PRD 05, PRD 07, PRD 08, PRD 10,
PRD 11

---

## Design-Grundsätze

1. **Neue Karriere, neue Entdeckung:** Namen und bekannte Talente dürfen nicht
   in jedem Save identisch sein.
2. **Deterministisch pro Save:** Weltgenerierung hängt nur von
   `master_seed`, Generator-Version und stabilen Salts ab.
3. **Einmal erzeugen, dann speichern:** Laden rekonstruiert keine Welt. Clubs
   und Spieler kommen aus dem Savegame.
4. **Call-order-unabhängig:** Neue Generatoren dürfen bestehende Entitäten
   nicht verändern. Jede Entität erhält eine eigene abgeleitete Seed.
5. **Eine Welt für alle Systeme:** Liga, Scouting, Transfers, KI-Wachstum und
   Match-Wrapper lesen dieselben Clubs und Spieler.
6. **Fiktional und lokal glaubwürdig:** Namen sind original, aus regionalen
   Bausteinen erzeugt und innerhalb eines Saves eindeutig.
7. **Underdog, nicht Opfer:** Der Startclub liegt sportlich im unteren Bereich,
   kann aber mit guten Entscheidungen die Klasse halten.

---

## 12.1 Welt-Seed und Generator-Version

`rng_state.master_seed` aus PRD 08 ist zugleich die `world_seed`.

```typescript
interface WorldState {
  generation_version: 1;
  clubs: WorldClub[];
}

interface WorldClub {
  id: string;
  name: string;
  short_name: string;
  region: string;
  division_id: "regionalliga-nord" | "oberliga-nord";
  identity: "community" | "workers" | "academy" | "traditional" | "ambitious";
  reputation: number; // 0–100, keine Spieler-Potentialskala
  rivalry_ids: string[];
}
```

`WorldState` liegt in `state.json`. Die Profispieler liegen weiterhin in
`players.json` beziehungsweise im persistierten KI-Kaderzustand.

Seed-Ableitung:

```text
entity_seed = hash(
  master_seed,
  generation_version,
  entity_kind,
  stable_index
)
```

Beispiele für `entity_kind`: `club`, `club_roster`, `player`,
`player_hidden`, `contract`, `scout_prior`.

Eine globale, fortlaufend konsumierte Zufallsquelle ist verboten. Sonst würde
das spätere Einfügen eines Clubs alle folgenden Spieler verändern.

### New-Game-Regel

- „Neue Karriere“ erzeugt standardmäßig eine zufällige `master_seed`.
- Die UI zeigt die Seed und erlaubt optional eine manuelle Eingabe.
- Gleiche Seed + gleiche `generation_version` = identische Startwelt.
- Nach der Erzeugung ist die gespeicherte Welt maßgeblich. Ein Update des
  Generators verändert bestehende Saves nicht.

---

## 12.2 Ligastruktur

| Spielklasse | Clubs | Begegnungen | Spiele pro Club |
|---|---:|---:|---:|
| Regionalliga Nord | 18 | Hin- und Rückrunde | 34 |
| Oberliga Nord | 18 | Hin- und Rückrunde | 34 |

Regeln:

- Jeder Club spielt gegen jeden Gegner einmal zuhause und einmal auswärts.
- Pro Spieltag hat jeder Club genau ein Ligaspiel.
- Tabelle: Punkte, Tordifferenz, erzielte Tore, direkter Vergleich.
- Regionalliga Platz 18 steigt direkt ab.
- Oberliga Platz 1 steigt direkt auf.
- Regionalliga Platz 17 und Oberliga Platz 2 spielen Relegation.
- Der Spielerclub kann auf- und absteigen. Kein Schutz.
- Die Welt enthält in M1 genau diese zwei Spielklassen, entsprechend F10.3.

Der Ligakalender umfasst 34 Spieltage. Spieltag 1 liegt Ende August (KW 35),
nicht in KW 1. Saisonabschluss, Awards, Vorstandsauswertung und Intake laufen
erst nach dem 34. Ligaspiel.

---

## 12.3 Club-Generierung

Der Standard-Spielerclub **FC Nordstern** behält seine originale Identität und
lokale Story-Rolle aus PRD 01. Seine Spieler und sportlichen Ausgangswerte
werden pro Save neu erzeugt.

Die weiteren 35 Clubs werden aus kombinierbaren, kuratierten Namensbausteinen
erzeugt:

```text
prefix:  FC | VfB | TSV | SV | Union | Eintracht | Fortuna | SC
place:   eigenständiger fiktionaler Ortsname
suffix:  optional, z. B. 04 | 1912 | Nord | Hafen
```

Regeln:

- Keine Namen realer Profivereine.
- Clubname und `short_name` sind innerhalb der Welt eindeutig.
- IDs leiten sich aus Seed und stabilem Index ab, nicht nur aus dem Namen.
- Regionen stammen aus einer kuratierten fiktionalen Norddeutschland-Liste.
- Räumlich nahe Clubs haben bevorzugt eine Rivalität.
- Jeder Club hat höchstens zwei Start-Rivalen.
- Clubidentität beeinflusst Darstellung und KI-Präferenz, aber erzeugt keinen
  versteckten pauschalen Matchbonus.

### Stärkeverteilung

- Regionalliga-Clubs sind im Median stärker als Oberliga-Clubs.
- Die Verteilungen überlappen: ein guter Oberligist kann schwächer
  Regionalligisten schlagen.
- FC Nordsterns Startelf liegt 8–15 CA-Punkte unter dem
  Regionalliga-Median und höchstens 5 Punkte unter dem zweitschlechtesten
  Club. Dadurch ist Klassenerhalt schwer, aber nicht vorbestimmt.
- Kein Club erhält eine feste langfristige Stärke. Entwicklung und Transfers
  verwenden dieselben Regeln wie beim Spielerclub.

---

## 12.4 Profikader-Generierung

Jeder Club startet mit 22 Profispielern:

| Gruppe | Anzahl |
|---|---:|
| GK | 2 |
| CB | 4 |
| LB/RB | 4 |
| DM/CM/AM | 6 |
| LM/RM/LW/RW | 3 |
| CF | 3 |

Sekundärpositionen dürfen die genaue Formation variieren lassen. Kein Club
darf wegen der Generierung ohne gültige Elf für mindestens eine
Match-Engine-Formation starten.

### Alter

Die Altersmischung pro Kader:

- 18–21: 20–30 %
- 22–27: 40–50 %
- 28–32: 20–30 %
- 33–36: 5–15 %

Jeder Kader enthält mindestens:

- zwei Spieler U21,
- zwei Spieler ab 30,
- einen Torwart,
- einen positionsgültigen Ersatz pro Mannschaftsteil.

### Attribute und versteckte Werte

- Positionsprofile bestimmen nur die Attributverteilung, kein Potential.
- Alle Attribute bleiben 0–199 gemäß PRD 07.
- `hidden.anlage` pro Attribut: 0.85–1.50.
- `hidden.drive`: 0.4–1.6; die Startverteilung darf nicht vom Clubbesitz
  abhängen.
- `maturity_offset`: −5 bis +5 gemäß PRD 03 und PRD 07.
- Spielerclub und KI-Clubs werden mit denselben Generatorfunktionen erzeugt.
- Division und Clubstärke beeinflussen Startattribute, niemals die später
  erreichbare Obergrenze.

### Namen, Verträge und Historie

- Namen stammen aus kuratierten Vor- und Nachnamenspools.
- Kombinationen sind innerhalb einer Welt möglichst eindeutig; bei Kollision
  bleibt die Spieler-ID eindeutig.
- Verträge folgen PRD 05 und werden deterministisch erzeugt.
- Startverträge enden gestaffelt über die kommenden 1–4 Saisons.
- Löhne folgen Marktwert, Rolle und Division.
- Start-Historie enthält den aktuellen Club, aber keine erfundenen
  Karriereereignisse.

---

## 12.5 Scouting und Transfers

Die Marktliste wird nicht separat erzeugt.

```text
WorldState clubs
  + gespeicherte Kader
  → Scout-Zugriff des Spielerclubs
  → bekannte Kandidaten und CI-Bänder
  → Shortlist / Transferverhandlung
```

Regeln:

- Jeder fremde Profispieler ist grundsätzlich auffindbar, aber nicht
  automatisch gut bekannt.
- Suche und Scout-Aufträge unterstützen mindestens Alter, Position, Region
  und Club.
- Reports dürfen nur Wissen des Spielerclubs verwenden.
- Eigene Spieler sind vollständig bekannt (PRD 04.6).
- Transfers verändern denselben persistierten Kader, den Liga und
  Match-Wrapper verwenden.
- Ein verkaufter Spieler darf nicht als unveränderte Kopie beim alten Club
  oder in der Marktliste verbleiben.

---

## 12.6 Match-Engine-Wrapper

Die bestehende Engine bleibt unverändert.

Der Wrapper:

1. liest den persistierten Karriere-Kader des Clubs,
2. wählt eine gültige Elf und Bank,
3. mappt Karriere-Attribute 0–199 auf Engine-Attribute 0–100,
4. übernimmt Aufstellung und Taktik,
5. ruft die Engine mit
   `hash(master_seed, season, week, match_id)` auf,
6. schreibt Ergebnis, Minuten, Ratings und Ereignisfolgen in den
   Karriere-Zustand zurück.

Es gibt keine statische Engine-Squad als zweite Wahrheit für generierte Clubs.
Fallback-Demo-Squads sind nur für isolierte Engine-Tests erlaubt.

---

## 12.7 Persistenz und Migration

Neue Saves speichern:

- `state.world.generation_version`,
- alle 36 Clubprofile,
- beide Liga-Pools,
- alle aktiven Profispieler,
- `rng_state.master_seed`.

Bestehende Saves werden nicht im Nachhinein mit einer neuen Welt ersetzt.
Die Implementierungsmigration übernimmt ihre vorhandenen Clubs und Spieler
als `generation_version: 0` („legacy world“). Damit bleiben alte Karrieren
spielbar und reproduzierbar.

Export-Sanitizer:

- Club-, Liga- und sichtbare Spielerfelder bleiben erhalten.
- `hidden.*` bleibt entfernt gemäß PRD 08.3.
- Die Seed darf exportiert werden; `chain_details` bleibt verborgen.

---

## 12.8 Tests und Balance-Gates

### Determinismus

- Gleiche Seed erzeugt byte-identische Clubprofile und Spieler.
- Andere Seeds verändern mindestens 90 % der Spieler-IDs und Namen.
- Ein neuer Generator-Salt verändert keine Entitäten anderer Arten.
- Speichern und Laden verändert die Welt nicht.

### Liga

- Beide Divisionen enthalten genau 18 eindeutige Clubs.
- Ein doppeltes Rundenturnier erzeugt 34 Spieltage und 306 Partien pro Liga.
- Jeder Club hat 17 Heim- und 17 Auswärtsspiele.
- Keine Paarung kommt häufiger als zweimal vor.
- Aufstieg, Abstieg und Relegation erhalten je 18 Clubs pro Division.

### Kader

- 36 Clubs × 22 Spieler = 792 aktive Profispieler zum Start.
- Jede Mannschaft kann eine gültige Elf und Bank stellen.
- Alle Attribute, Hidden-Werte, Verträge und Alterswerte sind im erlaubten
  Bereich.
- Kein `potential`-Feld existiert.
- Über 100 Seeds liegt Nordstern im definierten Underdog-Korridor, gewinnt
  aber in der Compressor-Simulation gelegentlich den Klassenerhalt.

### Systemintegration

- Scout-Markt enthält ausschließlich persistierte Weltspieler.
- Transfer verschiebt genau ein Player-Objekt zwischen Clubs.
- Liga, Profil, Scout-Report und Match-Wrapper zeigen denselben Club.
- Kein Produktionspfad lädt `SEED_DIVISION` oder `SEED_OBERLIGA`.

---

## References

- Narrative und Underdog-Ton: PRD 01
- Wachstum: PRD 02
- Scouting: PRD 04
- Transfers: PRD 05
- Player-Schema: PRD 07
- Savegame und RNG: PRD 08
- Feature-IDs F10.1–F10.8: PRD 10
- Liga-Ökonomie: PRD 11
