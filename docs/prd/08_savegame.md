# /docs/prd/08_savegame.md

**Version:** 1.3
**Last Updated:** 2026-10-11
**Status:** Final (§08.10 pre-release override active until GA)

---

## Purpose

Savegame-Struktur, Versionierung, Migrations-Logik, Cheating-Schutz beim Export. Mehrere JSON-Dateien statt einer Mono-Datei.

---

## Scope

- `/src/persistence/savegame.ts`
- `/src/persistence/sanitizer.ts`
- `/src/persistence/migrations/`
- Manifest und Versionierung

**Dependencies:** PRD 07 (Player-Schema), alle Module (Serialisierung)

---

## Design-Grundsätze

1. **Multi-File Structure:** Ein Ordner pro Savegame.
2. **Versionierung:** Schema-Änderungen erhöhen `save_version` und legen eine Migration an.
3. **Sanitizer nur beim Export:** `hidden.*` werden entfernt. Lokale Saves behalten sie.
4. **Atomic Writes:** Jede Datei wird als temp geschrieben und dann umbenannt.

---

## Specification

### 08.1 Dateistruktur

```text
/savegame_{name}_{slot}/
  manifest.json     Metadaten, Version, Struktur-Index
  state.json        Jetzt: Woche, Saison, dynamische Zustände
  players.json      Alle aktiven Spieler (PRD 07)
  retired.json      Ruhestands-CAs
  history.jsonl     Append-only Event-Log
  chronicle.json    Vereinschronik (Feature F11.4, noch ohne eigene PRD)
  rng_state.json    Seed-Kette
```

### 08.2 Manifest-Struktur

Neue Saves starten bei `save_version` 1 und einer leeren Migrationsliste.

```json
{
  "save_version": 1,
  "created": "2026-09-22T14:00:00Z",
  "last_played": "2026-09-22T14:00:00Z",
  "game_version": "0.1.0",
  "player_club_id": "cl_fc_dynamo",
  "manager_name": "Max Muster",
  "current_week": { "season": 1, "week": 34 },
  "migrations_applied": []
}
```

### 08.3 Sanitizer (Export-Schutz)

```typescript
function sanitizeForExport(save: RawSave): ExportSave {
  for (const p of save.players) {
    delete p.hidden;
    p.history.growth.forEach((s) => delete s.drive_at_snapshot);
  }
  delete save.rng_state.chain_details;
  return { ...save, manifest: { ...save.manifest, sanitized: true } };
}
```

Nur bei Export (Download/Share), nicht beim lokalen Speichern. `sanitized: true` sagt Konsumenten, dass `hidden` fehlen darf.

### 08.4 Versionsmanagement

- Schema-Änderung → `save_version` +1.
- Datei: `/src/persistence/migrations/migration_XXX_<description>.ts`.
- Migrationen sind one-way. Fehlschlag: read-only Backup, neues Spiel.
- Alte Felder nicht löschen, nur `deprecated: true` markieren.
- Die erste geschriebene Migration ist `001`. Es gibt keine historische `001_add_drive`.

### 08.5 Atomic Write

Jede Datei des Save-Ordners einzeln:

```typescript
async function writeAtomic(finalPath: string, body: string): Promise<void> {
  const tmpPath = `${finalPath}.tmp`;
  await fs.writeFile(tmpPath, body);
  await fs.rename(tmpPath, finalPath);
}
```

Ein Crash zwischen zwei Dateien lässt die ältere Datei intakt. Der Lade-Pfad prüft, dass `manifest.save_version` zu den Dateien passt, und verweigert halbe Saves.

### 08.6 RNG-State

```json
{
  "master_seed": 1234567,
  "weekly_seed_chain": {
    "algorithm": "hash(master_seed, season, week)",
    "purpose": "Match-Engine-Wrapper, Intake, Zufalls-Events"
  },
  "companion_note": "Spieler-individuelles Gaussian Noise nutzt hash(seed, player_id, week, attr)"
}
```

### 08.7 Invarianten

| Regel | Überprüfung |
|---|---|
| Speichern nur am Wochenende, nach Abschluss der Sim | Aufruf während der Sim wirft |
| Migrationen laufen linear | `migration_001` vor `migration_002` |
| Export entfernt `hidden` | Kein `anlage` und kein `drive` im Export |

### 08.8 Finanzierung (F6.6 — ab Migration F6.6-A)

Block in `state.json` unter `pipeline.financing` (vollständige Felder PRD 11.12.3):

```typescript
interface BankLoan {
  principal: number;
  remaining: number;
  apr_weekly: number;
  weekly_payment: number;
  drawn_season: number;
  drawn_week: number;
}

interface FinancingCareerState {
  story_offers_shown: number;
  channel_status: Record<string, "offered" | "accepted" | "declined" | "expired">;
  active_bank_loan?: BankLoan;
  bank_cooldown_until_week?: number;
}
```

Stadion-Erweiterung bei Namensrecht (Slice F6.6-C): optional `naming_rights_sponsor`, `naming_rights_until_season` auf `ClubStadium` — eigene Migration.

### 08.9 Cloud-Sync (M1, optional)

Sync-Code + gzip-Blob auf Supabase; lokal unverändert PRD 08.1. Kein `save_version`-Bump für Cloud-Transport (gleiches JSON-Schema nach gunzip). Spezifikation: **PRD 18**. Cloud-Pull nutzt denselben Lade-Pfad wie Import (§08.10).

### 08.10 Pre-release compatibility (until GA)

**Gilt bis** öffentlicher Launch oder explizite PRD-Änderung („save compatibility: GA“). **Überschreibt** §08.4 migration-on-load für Spieler-Laufzeit.

| Regel | Bedeutung |
|--------|-----------|
| **Unterstützt** | Nur Saves mit `manifest.save_version === SAVE_VERSION` (Code: [`SAVE_VERSION`](../../src/persistence/savegame-model.ts)). |
| **Nicht unterstützt** | Ältere localStorage-Slots, alte JSON-Exports, Cloud-Blobs von früheren Deploys — **Ablehnung** mit Hinweis; **Neues Spiel** oder Import einer Datei aus **diesem Build**. |
| **Neuer als App** | `save_version > SAVE_VERSION` → Ablehnung („App aktualisieren“). |
| **Schema-Disziplin** | Persistente Schema-Änderungen weiter **`save_version` +1** und Migrations-Datei (§08.4) für Repo, Tests und Dev-Skripte — **nicht** für automatisches Upgrade alter Spielstände in Pre-Release. |
| **Export/Import-Vertrag** | JSON Export → Import auf gleichem Build: Round-Trip muss halten; Sanitizer §08.3 unverändert für Share-Export. |
| **GA-Flip** | Danach §08.4 wieder verbindlich; minimale unterstützte Version und Migrations-Kette produktseitig festlegen. |

Implementierung: [`assertSupportedSaveVersion`](../../src/persistence/savegame-model.ts) in [`normalizeSave`](../../src/persistence/local-save.ts).

---

## References

- Cloud M1: PRD 18
- Pre-release load policy: §08.10; Game modes: PRD 24
- Player-Schema: PRD 07
- Feature-Chronik: F11.4 in PRD 10
- Meta-PRD `13_meta.md`: noch nicht geschrieben
