# /docs/prd/19_assistant_scouting_scope.md

**Version:** 1.0  
**Last Updated:** 2026-10-06  
**Status:** Final (F8.5 Scouting-Delegation)

---

## Scope

Assistant delegation toggle **Scouting** (`assistantDelegation.scouting`):

| Assistent darf | Assistent darf nicht |
| --- | --- |
| Scout-**Aufträge** anlegen (Qualitäts-abhängig) | Regions- oder Vereins-Jobs auf der Karte starten |
| Unbeobachtete **Pool**-Spieler bis Kapazität zuweisen | Spieler in den Pool aufnehmen (Discovery) |
| Wöchentlich `syncAssignmentTargets` via `assistantScoutBoard` | Transfer/Kauf ohne Pool-Eintrag |

**Ziel (Produkt):** Der Manager **erweitert** den Pool manuell; der Assistent **arbeitet** die Marktliste ab (CI enger), ohne Map-Micromanagement.

---

## Gap (Stand 2026-10-06)

`assistantScoutBoard` filtert über Auftrags-Kriterien (U21, CF, …) — deckt noch nicht garantiert **alle** Pool-IDs ab. Nächster Slice: Rotation über unassigned / hohe Unsicherheit im gesamten Pool.

---

## Code

- [`src/staff/assistant-delegation.ts`](../../src/staff/assistant-delegation.ts) — `applyAssistantDelegationWeek`, `assistantScoutBoard`
