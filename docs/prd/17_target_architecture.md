# /docs/prd/17_target_architecture.md

**Version:** 1.2  
**Last Updated:** 2026-10-03  
**Status:** Draft (Zielbild — PM-Entscheidungen 2026-10-03 eingetragen)

---

## Purpose

Zielarchitektur für **v1 und darüber**: Core Business Logic (Match-Engine +
Welt-/Wochen-Simulation) als **eigenes Modul**, **ohne Framework-Kopplung**.
Spiel **offline-first** im Client; **kein** Betrieb von Gameplay-Servern.
Optional später: **Save-Sync** für denselben Spielstand auf mehreren Geräten
(U-Bahn, Handy, PC) — nicht Multiplayer, nicht Shared League.

Diese Datei ergänzt PRD 01 (Vision, Nicht-Ziele), PRD 08 (Savegame), PRD 10
(Scope) und Gesetz 4 in `.cursorrules` (Engine-Ordner als Sim-Quelle).

---

## Scope

**In:** Paket-Grenzen, Laufzeitorte (Client vs. optional Sync), Deploy/Vertrieb
(Static Host, Steam), Kapazitätsdenken für Einzelspieler-Skalierung,
bewusste Nicht-Ziele.

**Out:** Konkrete Sync-API-Schemas (eigenes PRD wenn gebaut), Engine-Formeln
(PR D 02+), UI-Räume (PRD 14), Broadcast (PRD 16).

**Dependencies:** PRD 01, 08, 10, 12; AGENTS.md Non-negotiables (kein
Multiplayer, kein 3D-MMO-Backend).

---

## Produkt-Spannung (gelöst durch dieses Zielbild)

| Wunsch | Lösung im Zielbild |
|--------|---------------------|
| Kein Online-Game betreiben, keine Hardware für Matches | Engine **nur im Client**; Cloud = Static Files ± Save-Blobs |
| Gleicher Spielstand Handy ↔ PC | **Save-Sync** (Account oder Export), nicht zentral simulierte Partien |
| Steam / Vertrieb | **Box** (Installer oder Depot) mit lokaler Engine; Steam hostet nicht das Spiel |
| Core Logic schützen | **`engine`-Paket**: pure TypeScript, testbar, eine Wahrheit |

„Online“ im Sinne von **Download + Sync**, nicht **Gameplay-Server**.

---

## Schichten (Target)

```text
┌─────────────────────────────────────────────────────────────┐
│  apps/web (React) — Präsentation, Cockpit, Matchday UI      │
│  apps/desktop (optional) — Tauri/Electron + Steam APIs       │
└───────────────────────────┬─────────────────────────────────┘
                            │ ruft nur über klare Facades
┌───────────────────────────▼─────────────────────────────────┐
│  packages/game-sim — Wochenpipeline, Liga-Meta, Economy*    │
│  (* wo nicht schon in domain-Modulen)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  packages/engine — Match step(), Events, Determinismus, RNG   │
│  KEIN import von react, hono, wrangler, vite                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  packages/shared — IDs, MatchView-Typen, Seed-Clubs, Contracts│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  packages/persistence — Savegame, Migrationen, Sanitizer     │
│  Adapter: localStorage | file | sync-backend (optional)      │
└─────────────────────────────────────────────────────────────┘
```

**Heute (Übergang):** Engine unter `server/src/engine/`; API unter
`server/src/api/`; Worker bundelt API + Engine. **Ziel:** Engine-Code in
`packages/engine` (oder gleichwertig), `server` nur noch **Tools + Tests +
optional Sync-API**, nicht Match-CPU in Produktion.

**MatchView** (Frames, Lines, Report) bleibt **Projektion** der Event-Liste —
gebaut im Client aus `engine` + `commentary`-Modul (ebenfalls framework-frei).

---

## Laufzeit: Was wo läuft

| Vorgang | Ziel-Laufzeit | Begründung |
|---------|---------------|------------|
| Vollständiges Match (Karriere, Sandbox) | **Browser / Desktop** | ~100–200 ms CPU, ~MB JSON; kein Worker-Budget |
| Liga-Spieltag (N Partien) | **Client** (Batch oder lazy) | Gleiche Engine, kein 503-Spike |
| Wochenloop (Training, Finanzen, Jugend, …) | **Client** (heute schon) | Save-bound |
| Save lesen/schreiben | **Client** + optional **Sync** | Autorität = Client; Server speichert nur Blob |
| Golden / Invariants / play-match | **Node (CI, Dev)** | Qualitätssicherung, kein Prod-Traffic |

**Regel:** Kein Produktions-Endpoint, der eine komplette `buildMatchView` für
einen fremden Nutzer ausführt. Sync-Endpoints nur für **Savegame-Bytes** und
Metadaten (Slot, Version, `save_version`).

---

## Deploy & Vertrieb

### Web (Browser + optional PWA)

- **Kernplattform v1:** Desktop-Browser und **Steam Deck** (Browser oder
  später Steam-Build) — gleiche Codebasis.
- **Mobile:** **Bonus** — UI-Arbeit **immer** responsive/mobile-first mitdenken
  (Testen unterwegs); kein separates „Mobile-First-Produkt“ vor Steam-Kern.
  Bei Steam-Erfolg: Mobile/PWA als **Monetarisierung** (z. B. Cloud-Save,
  Companion) denkbar, nicht als v1-Pflicht.
- **CDN / Worker nur Assets:** `index.html` + JS/CSS.
- **Kein** `POST /api/career-match` in Produktion (Deprecation-Pfad).
- Optional später: `POST /api/save` hinter Auth — klein, selten, billig.

### Steam

- **Passt** als Einzelspieler: Depot = Box, Spiel läuft **lokal**.
- **Steam Cloud:** Save-Sync zwischen Steam-Geräten (PC, Deck) — **nicht**
  Ersatz für Mobile-Browser ohne Steam-Client.
- Kein Dedicated Server, kein Steam-„Hosted Gameplay“ nötig.

### „Alles in eine Box“

- Desktop-Wrapper optional; **dieselbe** Engine + Persistence wie Web.
- Vertrieb = Box; **Betrieb** = optional Sync + CDN, nicht Match-Farm.

---

## Glossar (Architektur-Begriffe)

**PWA (Progressive Web App):** Die gleiche Web-App wie im Desktop-Browser, aber
„installierbar“ (Icon auf dem Homescreen, oft Vollbild ohne Adressleiste).
Technisch: weiterhin **HTML/JS im Browser** — kein App-Store-Pflicht, kein
eigenes Game-Server-Hosting. Gut für **schnelles Testen** und Bonus-Mobile;
**kein** Ersatz für eine native App mit Push/Steam-Integration.

**„Nur Export“ (Sync-Stufe M0):** Spielstand bleibt im Browser (`localStorage`).
Der Spieler kann den Save als **Datei exportieren** und auf anderem Gerät
**importieren** (oder per AirDrop/E-Mail an sich selbst). **Kein** Login,
**kein** Backend von uns — reicht für frühe Tester und Solo-Dev, unhandlich
für „automatisch gleicher Stand auf zwei Geräten“.

**„Drittanbieter“ (Sync, nicht Framework-Pflicht):** Hier **nicht** „Rails vs.
Spring“ als Spiel-Backend, sondern optional ein **fertiger Sync-/Auth-Dienst**
nur für Save-Dateien, z. B. Supabase, Firebase, Clerk + S3, iCloud (nur
Apple). Ihr betreibt **keine** Match-Logik dort — nur Blob hoch/runter.
**Eigenes Minimal-Backend** = kleiner eigener Dienst (z. B. Fastify + Postgres
**nur** für User + Save-Blobs). Framework-Wahl ist Implementierung; Produkt
entscheidet: **erst Export**, Sync-Dienst **später** wenn Tester-Kohorte und
Steam-Erfolg es rechtfertigen.

---

## Save-Sync (optional — nicht v1-Blocker)

Ziel: **Ubahn-Handy, gleicher Stand** ohne Gameplay-Server.

| Stufe | Mechanismus | Mobile |
|-------|-------------|--------|
| **M0** | localStorage + Export/Import (Datei) | Browser/PWA, manuell |
| **M1** | Account + verschlüsselter Blob (1 Slot aktiv) | Login in Web-App |
| **M2** | Steam Cloud (PC/Deck) + optional Web-Account verknüpft | Hybrid / Monetarisierung |

**PM (2026-10-03):** Erste Tester-Welle kann vorbei sein; für neue Kohorten
reicht **M0 + klare Export-Anleitung** bis Steam-Traction. M1/M2 nicht vor
Kern-Loop auf Browser/Deck drängen.

### Tester-Kohorte (M0 — Kurzbriefing)

Spiel und Match-Engine laufen **lokal im Browser**; wir hosten **keinen**
Spielstand in der Cloud. Drei Slots pro Browser (`localStorage`). Um denselben
Stand auf einem **zweiten Gerät** weiterzuspielen: im Hub-Menü **„💾
Spielstände“** → **Export** (JSON-Datei) → Datei sicher ablegen (Mail, Drive,
AirDrop) → auf dem anderen Gerät **dieselbe Deploy-URL** öffnen → **Import**
in einen freien oder bewusst gewählten Slot. **Vor „Website-Daten löschen“
oder Browser-Wechsel immer exportieren.** Gleiche **App-Version** (Deploy)
wie beim Export empfohlen — Import migriert ältere Saves nach vorn, nicht
neuere auf alte Builds. Vollständige Schritte: [`docs/tester-save-m0.md`](../tester-save-m0.md).

**Kapazität ~200 gleichzeitige Nutzer (nur Sync):** Größenordnung
wenige Requests/Minute, Speicher << 1 GB — ein kleiner Dienst oder
Serverless; **nicht** vergleichbar mit 200 Game-Servern.

**Nicht-Ziel:** Server-seitige Simulation zur „Validierung“ von Ergebnissen
(Cheating ist lokal akzeptiert, PRD 08.3 Sanitizer für Teilen).

---

## Kapazitäts-FAQ (Einzelspieler)

| Frage | Antwort |
|-------|---------|
| 200 Spieler gleichzeitig auf Steam? | 200 **lokale** Instanzen — **0** Engine-CPU bei euch |
| Was hostet ihr? | Builds, Patches, optional Save-API |
| Cloudflare Worker für Matches? | **Nein** im Zielbild (CPU-Limit, Kosten, 503) |
| Größter Client-Risiko? | Schwaches Handy beim ersten Match — Ladechunk + kurze CPU-Spitze |

---

## Abgrenzung zu „Online Game“

**Ja (erlaubt / Ziel):**

- Statisches Hosting der App
- Save-Sync, Login, Analytics (später)
- Steam als Store + Cloud Saves

**Nein (PRD 01 / AGENTS.md):**

- Multiplayer, Shared Leagues
- Authoritative Match-Server für alle Spieler
- Eigene Hardware für laufende Partien skalieren

---

## Übergang vom Ist-Stand

| Ist | Ziel | Slice |
|-----|------|--------|
| `POST /api/career-match` auf Worker | Client `buildMatchView` only | **Done** (2026-10-03) |
| `POST /api/matchday` auf Worker | Client `playMatchday` | **Done** (2026-10-03) |
| Worker Match-Routen | Nur `/health` + Static Assets | **Done** (2026-10-03) |
| Engine in `server/src/engine/` | `packages/engine` extract | Refactor ohne Verhaltensänderung |
| `dev:server` Fastify | Dev/CI/CLI (+ optionale `/api/*` Legacy) | Behalten |

Jeder Slice: Tests (Golden seed-2026, typecheck) grün; `save_version` nur
bei Schema-Änderung (PRD 08).

---

## Architektur-Regeln (verbindlich für neue Code)

1. **`engine` importiert nicht** `react`, `hono`, `wrangler`, UI, CSS.
2. **UI importiert nicht** Engine-Internals — nur Facades (`simulateMatch`,
   `buildMatchViewFromEvents`, …).
3. **Determinismus:** `hash(master_seed, season, week, match_id)` bleibt
   Contract (PRD / Gesetz 4).
4. **Produktion:** Kein neuer API-Pfad, der >50 ms CPU pro User-Match
   erzwingt, ohne explizite PRD-Änderung hier.
5. **Persistence:** Savegame bleibt Quelle der Wahrheit; Sync ist Replikation,
   nicht Simulation.

---

## Segregated Monolith (Repo-Struktur)

**Ein Repo, ein Produkt** — aber **kein** „alles importiert alles“. Module
haben eine **erlaubte Abhängigkeitsrichtung** (nur nach unten / zur Mitte):

```text
apps/web          →  game-sim, persistence, shared, (facade → engine)
apps/tools/server →  engine, shared, commentary (CLI/API dev only)
game-sim          →  engine, shared
persistence       →  shared, types (player schema)
engine            →  shared (minimal)
shared            →  (nichts aus apps/ui/server)
```

**Verboten:** `engine` → `src/ui`; `shared` → `react`; zirkuläre Imports
zwischen `economy` und `transfers` ohne klare Schnittstelle.

**Heute:** Ordner `src/`, `server/`, `shared/` — funktional schon Monolith,
Grenzen werden per Review + diese PRD geschärft. **Ziel:** gleiche Regeln,
optional später physische `packages/*`-Ordner; **kein** Big-Bang nötig.

**Interne Regel:** Neue Features landen im **domänennächsten** Modul; Querimport
nur über **öffentliche** Entry-Dateien (`index.ts` / Facade), nicht über
tiefe Pfade.

---

## Entscheidungen (Jan / PM, 2026-10-03)

| Thema | Entscheidung |
|-------|----------------|
| **Kernplattform** | Browser + Steam Deck (Steam Store als Ziel); Mobile responsive, Bonus/ später Monetarisierung |
| **PWA** | Optionaler Vertriebs-/Testkanal (installierbare Web-App), nicht Kern-Identität |
| **Sync v1 für Tester** | **M0 Export/Import** — kein Login-Backend für nächste Kohorte nötig |
| **Sync später** | M1: eigenes Mini-Backend **oder** Sync-Drittanbieter (nur Blobs) — erst nach Bedarf |
| **Monorepo** | Segregated monolith: Modul-Grenzen + Import-Richtung; Pfad `packages/engine` vs. `server/src/engine` = Refactor-Timing, nicht Produkt |

---

## Referenzen

- PRD 01 — Vision, Underdog, keine Private-Life-MMO
- PRD 08 — Savegame, Sanitizer, `save_version`
- PRD 10 — Scope (kein Multiplayer)
- PRD 16 — Broadcast (Projektionsschicht, nicht Engine-Kern)
- Deploy heute: `.github/workflows/deploy-cloudflare.yml` (verify + static)
