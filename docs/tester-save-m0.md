# Spielstand Export/Import (M0) — Tester-Anleitung

**Stand:** 2026-10-11 · **PRD:** [17_target_architecture.md](prd/17_target_architecture.md) (Save-Sync M0), [08_savegame.md §08.10](prd/08_savegame.md)

**Pre-Release:** Import akzeptiert nur Saves mit derselben **Save-Version** wie der laufende Build (siehe `SAVE_VERSION` im Code, derzeit 92). Vor einem Deploy mit Schema-Bump: **Export** aus dem aktuellen Build, wenn du den Stand behalten willst. Alte Browser-Slots können nach Update **leer werden** oder abgelehnt werden — erwartet, kein Bug.

Kein Login, kein Server — nur eine JSON-Datei, die du selbst bewegst.

**M1 Cloud (Sync-Code):** Optional auf derselben Deploy-URL — Spielstände → **Cloud aktivieren** oder **Von Cloud laden**. Code wie `fuss-xxxx-xxxx` sichern (Screenshot). Details: [PRD 18](prd/18_cloud_save_m1.md). Cloud-Stand muss dieselbe Save-Version haben wie die App. Export bleibt Notfall.

---

## Was du wissen solltest

| Thema | Kurz |
|--------|------|
| Wo liegt der Save? | Im **Browser** dieses Geräts (3 Slots, IndexedDB; alte `localStorage`-Slots werden beim ersten Laden übernommen). |
| Zweites Gerät | **Export** am Gerät A → Datei rüber → **Import** am Gerät B (**gleiche Deploy-URL / gleiche Save-Version**). |
| Automatischer Sync | **Nein** — nur manuell (oder M1 Cloud mit Sync-Code). |
| Nach Deploy-Update | Alte Slots/Imports können **abgelehnt** werden → Export vorher oder Neues Spiel. |
| Daten weg | Cache leeren, privates Fenster, anderer Browser = Save weg → **vorher exportieren**. |

---

## Spielstände öffnen

1. Im **Club-Hub** das **Menü** öffnen (☰ / Einstellungen — je nach Build).
2. **„💾 Spielstände“** wählen.

<!-- SCREENSHOT: Hub-Menü mit Eintrag „Spielstände“ -->

Du siehst **3 Slots**, den **aktiven** Slot und ob ein Slot leer oder belegt ist.

<!-- SCREENSHOT: Save-Manager-Modal mit drei Slots -->

---

## Export (Backup / Umzug)

1. Den Slot wählen, den du sichern willst (aktiver Slot = der, in dem du gerade spielst).
2. **„⬇ Export (Slot N)“** klicken.
3. Browser lädt eine Datei herunter, z. B.  
   `fussballmanager_Max_Mustermann_s1_w12.json`  
   (Managername, Saison, Woche).

<!-- SCREENSHOT: Export-Button im Save-Modal -->

4. Datei an einen sicheren Ort legen:
   - E-Mail an dich selbst
   - iCloud Drive / Google Drive / Dropbox
   - USB / AirDrop zum Handy

**Tipp:** Nach einer längeren Session oder vor dem Schließen des Tabs einmal exportieren — **besonders vor einem neuen Deploy**.

---

## Import (auf anderem Gerät oder nach Datenverlust)

1. **Gleiche Spiel-URL** öffnen wie beim Export (Production-Link vom Team).
2. **„💾 Spielstände“** öffnen.
3. Entscheiden, in welchen **Slot** der Stand soll (Import **überschreibt** diesen Slot).
4. **„⬆ Import → Slot N“** → JSON-Datei auswählen.
5. Bei Erfolg lädt das Spiel den Slot; Modal schließt sich.

<!-- SCREENSHOT: Import-Button und Dateiauswahl -->

Bei Fehlermeldung: Datei kaputt, falsches Format, **Save-Version passt nicht zu dieser App** (älterer oder neuerer Build) — aktuellen Stand neu exportieren oder Neues Spiel.

---

## Typische Szenarien

### PC spielen, unterwegs am Handy weiterspielen

1. PC: Export nach Spielsession (gleicher Build wie Handy-URL).
2. Datei ins Handy (Drive, Mail, AirDrop).
3. Handy: Browser öffnen → Import in Slot 1 (oder freien Slot).
4. Am Handy spielen; für Rückweg erneut exportieren.

### Neuer Tester, frischer Browser

- Slot leer → **Neues Spiel** im Slot starten **oder** Import, wenn du einen Demo-Save vom Team bekommen hast (**von diesem Build**).

### Zwei Saves parallel testen

- Slot 1 = Build A, Slot 2 = Build B — pro Slot exportieren, nicht verwechseln.

---

## Was nicht in der Export-Datei fürs Team-Sharing gedacht ist

Der Save-Manager-Export ist ein **voller** Stand für **dein** Backup (inkl. interner Sim-Daten).  
Zum **öffentlichen Teilen** von Saves (ohne Spoiler/Hidden-Werte) ist später ein separater Sanitizer-Export geplant (PRD 08.3) — nicht der Standard-Button im Modal.

---

## Checkliste vor Feedback-Session

- [ ] Deploy-URL und ungefähres Datum der Version notiert
- [ ] Nach wichtigen Fortschritten exportiert (vor Deploy-Bumps)
- [ ] Bug-Report: Browser (Chrome/Safari/Firefox), Desktop oder Mobile
- [ ] Bei „Save weg“: ob Cache geleert / anderes Gerät ohne Import

**Spieltag-Screenshots (optional, Mobile):** Wenn du am Handy oder in schmaler Browser-Breite (~390 px) testest, reichen drei kurze Screenshots fürs UI-Feedback: (1) **Club-Hub** nach Import — Kacheln untereinander, kein seitliches Wischen der ganzen Seite; (2) **Aufstellung** vor Anpfiff — Rasen + Bank lesbar; (3) **Livespiel** in **Ereignisse** (und einmal **Spielfeld**, falls du umschaltst) — Score, Steuerleiste und Drittel/Seite-HUD ohne abgeschnittene Buttons. Dateinamen mit Slot + KW reichen (`s1_kw41_hub.png`); kein neues Feature nötig, nur Dokumentation fürs Team.

---

## Fragen ans Team

- Link zur aktuellen Test-URL
- Ob ein **Referenz-Save** (JSON) zum Import mitgeschickt wird (muss **dieselbe Save-Version** haben)
- Bekannte Limits (z. B. iOS Dateiauswahl)
