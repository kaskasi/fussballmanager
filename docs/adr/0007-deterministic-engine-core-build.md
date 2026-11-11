# ADR 0007 — Deterministischer Engine-Kern: Eigenbau statt Fremd-Engine

- Status: angenommen (Owner, 2026-10-31: „Build, weil Determinismus Kern des Produkts ist“)
- Datum: 2026-10-31
- Bezug: PRD 33 (Engine als Library), ADR 0003 (Kalibrierung)

## Kontext

Die Match-Engine wird eine Library (PRD 33). Ihr Versprechen: Gleiche
Eingabe, gleicher Seed und gleiche Entscheidungen ergeben dasselbe Spiel,
Ereignis für Ereignis, auf jeder unterstützten Plattform.

Beim NFL-GM-Prototyp mit txfl hat der Owner das Gegenteil erlebt. Das LLM
konnte die Library mühelos einbauen, aber jeder Lauf lieferte andere
Ergebnisse. Für Spielstände, Wiederholungen, Tests und Mehrspieler mit
Server-Autorität ist das wertlos.

Stand heute:

- Der Kern ist schon weitgehend deterministisch. Der Mulberry32-Zustand liegt
  im Match-State, `step` ist rein, und die Seeds kommen aus `master_seed`. Ein
  goldenes Spiel liegt in `server/src/engine/golden/seed-2026.json`.
- Der Kommentar wählt Varianten per Hash aus Seed, Ereignis-`seq` und
  Zeilen-ID (`server/src/commentary/line-copy.ts`, `story-slots.ts`). Er zieht
  nie aus dem Spiel-Zufall.
- Drei Aufrufe sind plattformabhängig: `Math.exp` in `weights.ts` sowie
  `Math.hypot` in `helpers.ts` und `pass-graph.ts`. ECMAScript legt für exp,
  log, pow, hypot und die Winkelfunktionen nur „implementierungsabhängig
  genähert“ fest. Verschiedene JavaScript-Engines dürfen in den letzten Bits
  abweichen. Eine einzige Abweichung kann im weiteren Spielverlauf einen
  anderen Ausgang erzeugen.
- Ergebnisse tragen keine Engine-Version. Es gibt keine Testvektoren über
  Plattformen hinweg.

Kaufen oder selbst bauen: Eine fremde Engine oder Mathe-Bibliothek würde
genau den Teil aus der Hand geben, der das Produkt ausmacht.

## Entscheidung

1. **Eigenbau.** Kern, Zufallsgenerator und Mathe-Funktionen schreiben wir
   selbst. Der Kern hat keine Laufzeitabhängigkeiten: keine fremde
   Simulations-Engine, keine Mathe-Bibliothek.
2. **Rechenregeln im Kern.** Ein Test durchsucht den Quelltext und schlägt
   bei Verstößen fehl.
   - **Erlaubt:** + − × ÷, `Math.sqrt`, `floor`, `ceil`, `round`, `trunc`,
     `abs`, `min`, `max`, `Math.imul` und 32-Bit-Bitoperationen.
   - **Verboten:** `Math.random`, `Date` und jede Uhrzeit, `Math.exp`, `log`,
     `pow`, `hypot`, `sin`, `cos`, `tan`, `atan2` und alle anderen genäherten
     Funktionen. Dafür gibt es eigene Funktionen, nur aus Grundrechenarten
     gebaut (Reihenentwicklung oder Tabelle).
   - **Feste Reihenfolge:** Keine ergebnisrelevante Logik läuft über die
     Iteration von Objekten oder Maps ohne feste Ordnung. Jede Sortierung hat
     einen vollständigen Tiebreak.
   - **Nichts Locale-Abhängiges** und keine Umwege über Strings.
   - `Math.sqrt` bleibt erlaubt. IEEE 754 verlangt korrekte Rundung, und alle
     Zielplattformen rechnen die Wurzel so in Hardware. Die Sprachspezifikation
     garantiert das formal nicht, deshalb sichern es die Testvektoren ab.
3. **Benannte Zufallsströme.** Aus dem Spiel-Seed werden drei Ströme
   abgeleitet:
   - `sim` für den Spielverlauf,
   - `commentary` für den Kommentar,
   - `presentation` für den Ereignis-Platz und die Darstellung.

   Nur `sim` bestimmt das Ergebnis. Kommentar, Ereignis-Platz und Stimme
   ziehen nie daraus.
4. **Engine-Version im Ergebnis.** Ergebnisse und Replays tragen die
   Engine-Version.
   - Ändert sich bei gleicher Eingabe auch nur ein Ereignis, steigt die
     Version: vor 1.0 die Minor-, danach die Major-Version.
   - Patch-Releases ändern kein Ergebnis.
5. **Testvektoren sind die Spezifikation.** Ein Vektor besteht aus Eingabe,
   Seed und Entscheidungsprotokoll, dazu dem Hash des erwarteten
   Ereignisprotokolls.
   - Die Sammlung läuft in CI in Node, Chromium, Firefox und WebKit.
   - Jede spätere Portierung (C#, GDScript, WebAssembly) muss sie bestehen.
6. **Interaktive Spiele** sind eine Funktion aus Seed, Eingabe und
   Entscheidungsprotokoll. Eine Entscheidung gilt „nach Ereignis `seq` N“.
   Weder Uhrzeit noch Bildrate noch Netzwerk-Timing fließen ein.

## Alternativen

- **Fremde Engine einbinden (wie txfl):** schnell, aber Determinismus,
  Kalibrierung und Ereignis-Vertrag lägen nicht bei uns. Verworfen.
- **Deterministische Mathe-Bibliothek eines Dritten:** Drei Aufrufstellen
  rechtfertigen keine Abhängigkeit. Verworfen.
- **Festkomma-Arithmetik überall:**
  - Pro: am robustesten für Portierungen.
  - Contra: ein Umbau des ganzen Kerns (rund 9.400 Zeilen mit Tests).
  - IEEE-754-Grundrechenarten in fester Reihenfolge sind in JavaScript, C# und
    GDScript reproduzierbar.
  - Für v1 verworfen. Wir prüfen neu, falls ein Port die Testvektoren nicht
    erreicht.
- **Determinismus nur je Plattform:** reicht nicht für Replays,
  Server-Autorität und Spiele über Geräte hinweg. Verworfen.

## Konsequenzen

- Die drei Aufrufstellen werden ersetzt. Das kann letzte Bits und damit
  Spielverläufe ändern. Goldenes Spiel und Kalibrierung (ADR 0003) werden neu
  gemessen und neu aufgezeichnet.
- Neue Engine-Arbeit muss die Rechenregeln einhalten, sonst schlägt der
  Quelltext-Test fehl.
- Portierungen werden prüfbar statt geschätzt. Dafür gilt:
  - C- und C++-Compiler dürfen keine Fused-Multiply-Add-Kontraktion einsetzen;
    das wird ausdrücklich abgeschaltet.
  - Rundung (`Math.round` rundet Hälften nach oben) und 32-Bit-Ganzzahlen
    folgen den JavaScript-Regeln.
- Die eigene exp-Funktion ist langsamer als die eingebaute. Bei einer
  Aufrufstelle ist das vernachlässigbar.
