# /docs/prd/18_ruhephase_loop.md

**Version:** 1.0  
**Last Updated:** 2026-10-06  
**Status:** Draft (Design — Anti-Default-Next)

---

## Purpose

Spieler sollen nach dem Umfeld-/Setup-Peak nicht in **NEXT → Spiel → NEXT** driftieren. Dieses Dokument verbindet **Unterbrechungen** zwischen Spieltagen — ohne die Spieler-Map-Aktivität bei Scouting zu automatisieren.

---

## Drei Interrupt-Typen (v1)

| Typ | Beispiel | Blockiert NEXT? | Person bezogen? |
| --- | --- | --- | --- |
| **Entscheidung** | Camp-Leiter wählen, Jugend-Inbox | Ja (Inbox-Cap) | Ja (Camp / Spieler) |
| **Pflege-Erinnerung** | Wochenplan leer + Assistent Training | Ja, einmal/Woche | Nein |
| **Belohnung / Info** | Scout-Job fertig (Region/Verein) | Nein (Badge + Postfach) | Verein / Region |

Referenz-Implementierungen: PRD 03.6.2 (Camp-Leiter), Training-Reminder-Inbox, PRD 04.5 Postfach Scout-Job.

---

## Scouting in der Ruhephase

- **Spieler** vergrößert den Pool (Karte, Jobs, später Batch-Klicks).
- **Assistent** (F8.5) vertieft Wissen **nur** für Pool-Mitglieder — keine Geo-Automation.
- **Postfach** schließt den Kreis, wenn ein Job fertig ist (sichtbare Auszahlung der Map-Investition).

---

## Nicht in v1

- Assistent startet Regions-/Vereins-Jobs.
- Vollautomatisches Scouting ohne Karten-Klick.
- Lumo-„blind buy“ ohne Pool (weiter: PRD 04.5 / 05).
