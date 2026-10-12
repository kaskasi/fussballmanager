# /docs/prd/18_cloud_save_m1.md

**Version:** 1.0  
**Last Updated:** 2026-10-10  
**Status:** Final (M1 Sync-Code)

---

## Purpose

Optional **Save-Sync M1** (PRD 17): gleicher Spielstand auf Handy und Desktop ohne Gameplay-Server. **Sync-Code** statt Passwort/E-Mail. Supabase speichert **nur gzip-JSON-Blobs** + Metadaten.

---

## Scope

**In:** Sync-Code erzeugen, Cloud Push/Pull, UI in Spielstände, Edge Function + Postgres, Save-Kompaktierung für Blobs, Tester-Doku.

**Out:** Supabase Auth User, Multi-Slot-Cloud pro Code (M1 = **1 Blob pro Code**), Client-Verschlüsselung (Follow-up), Steam Cloud (M2), serverseitige Sim/Validierung.

**Dependencies:** PRD 08 (Savegame), PRD 17 (Target Architecture M1).

---

## Non-goals

- Multiplayer, geteilte Ligen (PRD 01).
- Engine- oder Wochen-Simulation auf dem Server.
- Passwort-Login, E-Mail Magic Link (eigenes M1.1 möglich).

---

## Sync-Code (Identität)

- Format: `fuss-XXXX-XXXX` ( Crockford-ähnlich, ~48 Bit Entropie).
- **Geheimnis:** Wer den Code kennt, darf Blob lesen/überschreiben (HTTPS).
- Server speichert **nur** `sync_code_hash = SHA-256(normalize(code) + server_pepper)`.
- Verlust des Codes = kein Cloud-Restore (lokal/Export bleibt M0-Fallback).

Optional `display_name` = `manifest.manager_name` (Label, kein Login).

---

## Blob & Pipeline

1. Client: `normalizeSave` → `compactSaveForCloudBlob` (History/Chronicle/Club-Events kappen) → JSON → **gzip**.
2. Upload: **last-write-wins** anhand `updated_at` (Server) vs. optional `client_updated_at` im Push (Konflikt-UI später; M1 Push überschreibt).
3. Download: gunzip → `parseSaveJson` — gleicher Lade-Pfad wie Import (**PRD 08.10**: nur `save_version === SAVE_VERSION`).

Lokal: **Browser-Adapter** (IndexedDB primär, Legacy-`localStorage`-Slots werden beim Laden migriert) + Client-Autorität. Cloud = Replikat.

---

## API (Supabase Edge Function `cloud-save`)

| Action | Body | Response |
|--------|------|----------|
| `register` | `sync_code` | `{ ok: true }` — legt Hash-Zeile an falls neu |
| `push` | `sync_code`, `blob` (base64), Metadaten | `{ ok: true, updated_at }` |
| `pull` | `sync_code` | `{ blob, save_version, last_played, display_name, updated_at }` oder 404 |

Rate-Limit: grob pro Hash/IP (Edge); Brute-Force erschwert durch Code-Länge.

Env (Supabase Secrets): `SYNC_CODE_PEPPER`, Service Role in Function only.  
Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## UI (PRD 09 / design.md Spielstände)

- **Cloud aktivieren** (aktiver Slot): Code erzeugen, einmal anzeigen, Register + Push.
- **Jetzt hochladen** wenn Code für Slot hinterlegt.
- **Von Cloud laden:** Code eingeben → Pull → Import in gewählten Slot.
- Export/Import (M0) bleibt.

---

## Kapazität (~500 Nutzer)

- Latest-only pro Code, ~2–3 MB/Blob gzip → Storage im niedrigen GB-Bereich.
- Requests: wenige hundert/Tag — Edge + Postgres Free/Pro ausreichend.
- Monitoring: Blob-Größe p95, 4xx/5xx Function — siehe `docs/ops-cloud-save-m1.md`.

---

## References

- M0: [`docs/tester-save-m0.md`](../tester-save-m0.md)
- PRD 17 Save-Sync Stufen
- Code: `src/persistence/cloud-save-*.ts`, `supabase/functions/cloud-save/`
