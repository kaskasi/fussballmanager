# Taktik — Spieler-Guide (DE, Review)

Spiegel zu `tactics-player-guide.en.md` für `de.json`.

---

## Wie Taktik im Spiel funktioniert

Taktik ist ein **SandboxPlan**: alles, was der Match-Wrapper zusätzlich zu **Startelf + Bank** an die Engine übergibt. Die Engine bleibt unverändert; Karriere-Spiele laufen über `buildMatchView` mit Kadern aus `applySandboxPlan`.

### Was du auf der Aufstellung steuerst

1. **Formation** (`4-3-3`, `4-4-2`, `2-3-5`)  
   Beim Wechsel wird ein **kompletter Standardplan** für die Form geladen: Mentalität, Pressing, Linie, Breite, Tempo, Intensität, Fluidität, Markierung und **Rollen** (invertierte Außen vs Überlappen, falscher Neuner vs Jäger usw.). Die Slots werden für die neue Form neu befüllt.

2. **Drei Stil-Presets** (pro Save: Ballbesitz / Kompakt / Offensiv → Standard **4-3-3 / 4-4-2 / 2-3-5**)  
   Ein Preset **ändert nicht die Formation**; es kopiert nur **Mentalität, Pressing und Linie** aus dem gespeicherten Preset auf deine **aktuelle** Formation. Du kannst die aktuellen Regler im Preset **speichern**.

3. **Feintuning** (drei Regler)  
   - **Men** — Mentalität (0–100)  
   - **Prs** — Pressing (0–100)  
   - **Lin** — Abwehrlinie (25–90 in der UI)  

   Die Zeile `Men / Prs / Lin` auf der Taktik-Karte ist dein Kurzüberblick.

Alles andere im Plan (Breite, Tempo, Intensität, Fluidität, Markierung, Torwart-/Außen-/Stürmer-Rollen) **kommt mit der Formation** — die Karriere-UI zeigt diese Regler noch nicht.

### Gegner

KI-Vereine bekommen Formation und Regler aus **Club-Identität** (z. B. traditional/workers → `4-4-2`). Kein versteckter Stärke-Bonus nur wegen „ambitious“.

### Gegner-Analyse

Nach dem Scout-Job laufen **10 Kopf-Simulationen** mit denselben Kadern wie das echte Spiel; nur **dein** Plan variiert: Lauf 0 = **aktueller** Plan, danach deine **drei Presets**. Die Postfach-Karte fasst Ergebnisse, ein 4×3-Raster und 2–3 Taktik-Zeilen zusammen — **nicht** das volle 375-Punkte-Gitter (nur Offline-Forschung).

Risiko-Tags: **hohe Linie** (Linie ≥ 62 und Pressing ≥ 58), **tiefer Block** (Linie ≤ 45 und Pressing ≤ 48), sonst **ausgewogen**.

---

## Gut spielen als Nordstern

Kein Universal-Rezept; Forschung mit gleicher Elf zeigt **unterschiedliche Top-Pläne pro Gegner**. Orientierung:

- **Normale Woche, kein Scout:** **4-3-3 Ballbesitz** (~M58 P64 L56).  
- **Scout-Report da:** empfohlene Formation + Risiko-Zeile wählen.  
- **Forschungshinweis:** oft **hohe Linie (L72)** und mittleres bis hohes Pressing — trotzdem niedrige Tore, kein 70-% Sieg.  
- **Auswärts vs stärker:** **Kompakt** / **4-4-2**, tiefer Block.  
- **Ergebnis jagen:** **Offensiv 2-3-5** — mehr Varianz.

**Aufstellung schlägt Regler.** Taktik ist die **marginale** Schicht auf dem Personal.

Nordstern startet **~8–15 CA unter Liga-Median**; Abstieg ist erlaubt; Wachstum und Transfers sind der lange Bogen.

---

## Ausgeglichene Teams?

Gemessen: Nordstern vs drei Gegner, **375 Pläne × 20 Läufe**. Auf gleicher Elf: etwa **0,3–0,5 Tore** Ø-Tordifferenz zwischen guten und schlechten Plänen.

Nicht gemessen: zwei Teams mit **gleicher CA**. Bei Ausgleich sollte Taktik **prozentual mehr** wiegen — aber kein Wundermittel gegen große Qualitätslücken.

---

## Kurz

1. Formation + drei Regler + drei Presets.  
2. Scout nutzen, Pressing/Linie nicht blind maxen, Formation bewusst wechseln.  
3. Underdog-Story: Taktik hilft überleben, nicht Tag-1 dominieren.  
4. Ausgeglichene Teams: Hypothese — Taktik tippt öfter; Zahlen bisher nur Underdog.
