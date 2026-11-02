# ADR 0008 — Attributmodell: kanonische Fähigkeiten und Schema-Adapter

- Status: vorgeschlagen (Umsetzung in PRD 33, Slice 3)
- Datum: 2026-10-31
- Bezug: PRD 33 (Engine als Library), ADR 0003 (Kalibrierung, Niveau-Pooling), ADR 0007 (Determinismus)

## Kontext

Spiele, die die Library nutzen, bringen ihr eigenes Spielermodell mit:

- eine einzige Gesamtstärke wie in Anstoß,
- sechs Werte wie auf Sammelkarten,
- rund 36 Attribute auf 1–20 wie im FM,
- oder unsere 15 Attribute auf 0–199.

Anforderung des Owners (2026-10-31): Die Modellierung muss ausgleichen, dass
Nutzer mehr oder weniger Attribute haben, mit bestimmten Gewichtungen.

Stand heute:

- **Was die Engine liest:** neun Fähigkeiten auf 0–100 (passing, tackling,
  shooting, pace, stamina, positioning, aerial, dribbling, goalkeeping), dazu
  Körpergröße, Form, Ermüdung und eine von acht Rollen
  (`shared/src/player.ts`).
- **Erster Schema-Adapter:** `shared/src/career-squad-bridge.ts` bildet unsere
  15 Karriere-Attribute auf diese neun ab. Er nutzt Gewichte (tackling aus
  55 % Stellungsspiel und 45 % Kraft) und einen Erfahrungsfaktor. Das ist im
  Kern schon ein Schema-Adapter, nur fest verdrahtet.
- **Niveau-Pooling:** ADR 0003 zieht beide Teams vor dem Anpfiff zu 85 % auf
  das Referenzniveau 60 (`LEVEL_POOLING` in `normalize-attributes.ts`). So
  spielen Amateur-Derby und Elite-Finale dieselbe Art Fußball, und die
  Abstände bleiben erhalten.
- **Fähigkeit und Neigung sind vermischt:** Wer gut schießt, schießt auch oft.
  Folgen in der Kalibrierung:
  - Der beste Schütze eines Teams gibt 53–55 % der Schüsse ab (Band ≤ 45 %).
  - Hattricks fallen in 4–11 % der Spiele (Band ≤ 6 %).
- **Getrennte Gewichte:** Die angezeigte Stärke (CA, `market-value.ts`) nutzt
  eigene Positionsgewichte, nicht die der Engine.

## Entscheidung

1. **Kanonische Fähigkeiten sind das, was die Engine liest.** In v1 sind das
   die neun Fähigkeiten plus Körpergröße. Eine neue Fähigkeit kommt nur dazu,
   wenn eine Auflösungsfunktion sie wirklich liest. Der Satz ist versioniert
   wie die Engine (ADR 0007).
2. **Schema-Adapter.** Ein Spiel beschreibt drei Dinge:
   - **Skala und Anker:** seine Attribute mit Skala und mindestens zwei
     Ankern, etwa „durchschnittlicher Profi“ und „Weltklasse“, optional
     „Amateur“. Die Library bildet stückweise linear auf die kanonische Skala
     ab. So meint „Durchschnittsprofi“ überall dasselbe, egal ob die Zahl 10,
     65 oder 120 heißt.
   - **Gewichtungsmatrix:** welche Spielattribute in welche kanonische
     Fähigkeit eingehen. Die Gewichte jeder Fähigkeit werden normiert, damit
     kein Schema die Kalibrierung sprengt.
   - **Rollen:** die Zuordnung seiner Positionen zu den acht Engine-Rollen.
3. **Abdeckung und Positions-Vorwissen.** Für jede Fähigkeit rechnet der
   Adapter aus, wie viel die Attribute des Spielers darüber verraten
   (Abdeckung von 0 bis 1). Der Wert ist eine Mischung:
   - Abdeckung × Wert aus den eigenen Attributen
   - plus (1 − Abdeckung) × Vorwissen aus Rolle und Gesamtstärke.

   Die Library liefert Rollenprofile mit. Ein Innenverteidiger ist zum
   Beispiel relativ zu seiner Gesamtstärke stark im Zweikampf und schwach im
   Dribbling. Ein Schema mit einer einzigen Gesamtstärke lebt ganz vom
   Vorwissen, eines mit 40 Attributen fast nur vom Spieler. Weniger Attribute
   heißen weniger individuelle Nuance, nicht ein anderes Gleichgewicht.
4. **Fähigkeit und Neigung sind getrennt.**
   - Fähigkeiten bestimmen, ob etwas gelingt.
   - Neigungen bestimmen, wie oft ein Spieler es versucht: Schuss, Dribbling,
     langer Ball, Flanke, Pressing.
   - Neigungen sind optional. Ohne Angabe kommen sie gedämpft aus Rolle und
     Fähigkeiten.
   - So werden Schussverteilung und Torschützenlisten einstellbar und
     prüfbar.
5. **Niveau ist getrennt von den Abständen.**
   - Duelle hängen von der Differenz der beteiligten Spieler ab.
   - Das absolute Niveau wirkt nur über das bestehende Pooling (ADR 0003) und
     einen ausdrücklichen Niveau-Parameter für Grundraten wie Passquote und
     Fehler.
   - Ob das Pooling für die Library auf 100 % geht, entscheidet die Messung in
     Slice 3.
6. **Stärke aus den Engine-Gewichten.** Die Library liefert eine Stärke pro
   Spieler und Rolle. Sie leitet sich aus der in Simulationen gemessenen
   Wirkung jeder Fähigkeit ab. Zeigt ein Spiel diese Zahl an, sagt sie voraus,
   was der Spieler im Spiel bewirkt.
7. **Zustand ist kein Attribut.** Form, Ermüdung, Moral und Konstanz wirken
   als Modifikatoren mit dokumentierter Effektgröße auf Fähigkeiten oder auf
   die Streuung der Tagesform. Sie sind keine eigenen Fähigkeiten.
8. **Vorlagen:**
   - Gesamtstärke (eine Zahl),
   - Sechs-Werte-Schema (Tempo, Schuss, Pass, Dribbling, Abwehr, Physis),
   - FM-artig (rund 36 Attribute auf 1–20),
   - The Club (15 Attribute auf 0–199; ersetzt die feste Brücke).

## Prüfung

- **Schema-Invarianz:**
  - Kanonische Referenzspieler werden in jede Vorlage projiziert und wieder
    zurück abgebildet.
  - Die Siegwahrscheinlichkeit eines Referenzteams gegen einen festen Gegner
    darf sich zwischen den Vorlagen um höchstens 3 Prozentpunkte
    unterscheiden.
  - Die Schwelle wird nach der ersten Messung bestätigt.
- **Kalibrierung:** Alle Bänder aus ADR 0003 sind grün, für jede Vorlage.

## Alternativen

- **Fester Attributsatz für alle** (jedes Spiel liefert unsere neun): einfach,
  aber dann schreibt jedes Spiel seine eigene, ungeprüfte Abbildung. Ein LLM
  liefert die jedes Mal anders. Verworfen.
- **Engine liest beliebige Attribute direkt:** nicht kalibrierbar. Verworfen.
- **Gelernte Abbildung** (ein Modell, trainiert auf Spieldaten): undurchsichtig
  und schwer zu versionieren. Verworfen.
- **Perzentile statt Anker** (Stärke relativ zur Spielerpopulation des
  Spiels): robust gegen beliebige Skalen, aber ohne Population nicht definiert,
  etwa bei einem einzelnen Testspiel. Als optionaler Modus später möglich.

## Konsequenzen

- `career-squad-bridge.ts` wird die Vorlage „The Club“. Die Ergebnisse
  unseres Spiels dürfen sich dabei nur im Rahmen der Kalibrierung ändern.
- Die Entscheidungsfunktionen der Engine (Schuss, Dribbling, Passwahl)
  brauchen Neigungen. Das ist eine Engine-Änderung nach ADR 0003, also mit
  Kalibrierung vorher und nachher.
- Ob The Club seine CA-Anzeige auf die Engine-Stärke umstellt, ist eine eigene
  Spielentscheidung.
