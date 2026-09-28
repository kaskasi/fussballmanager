# Deploy auf Cloudflare (Option B)

Ein **Cloudflare Worker** liefert die Match-API (`/api/*`) und die gebaute React-App (`dist/`) unter **einer URL** aus.

Spielstände bleiben im Browser (`localStorage`). Export/Import über **⋮ → Spielstände**.

---

## Voraussetzungen

- [Cloudflare-Account](https://dash.cloudflare.com/sign-up) (Free reicht zum Testen)
- Node.js 22+
- Repo lokal geklont
- Optional: eigene Domain in Cloudflare

---

## Schritt 1 — Dependencies installieren

```bash
cd fussballmanager
npm install
```

Das installiert Root, `shared`, `server` und `worker` (inkl. Wrangler).

---

## Schritt 2 — Lokal testen

Terminal 1 — nur API (wie bisher):

```bash
npm run dev:server
```

Terminal 2 — Frontend:

```bash
npm run dev
```

**Oder** alles wie in Production (Worker + SPA):

```bash
npm run build
npm run dev -w @fussballmanager/worker
```

Öffnen: `http://localhost:8787`

- UI lädt von `dist/`
- `/api/health` → `{"ok":true,"runtime":"cloudflare-worker"}`

Woche simulieren / Match spielen — wenn das klappt, ist der Worker bereit.

---

## Schritt 3 — Bei Cloudflare anmelden

```bash
cd worker
npx wrangler login
```

Browser öffnet sich → Cloudflare-Account bestätigen.

Alternativ vom Repo-Root: `npx wrangler login --cwd worker`

> **Hinweis:** `-w` ist nur ein npm-Workspace-Flag (`npm run … -w …`), nicht für Wrangler.

---

## Schritt 4 — Ersten Deploy

**Vom Repo-Root** (`fussballmanager/`, nicht `worker/`):

```bash
cd ..   # falls du noch in worker/ bist
npm run deploy:cloudflare
```

**Oder aus `worker/`:**

```bash
npm run deploy:cloudflare
```

(Dort: erst `npm run build` im Root, dann `wrangler deploy`.)

Manuell:

```bash
npm run build          # Repo-Root
cd worker && npx wrangler deploy
```

Ausgabe z. B.:

```text
Published fussballmanager
  https://fussballmanager.<dein-subdomain>.workers.dev
```

### Smoke-Test

```bash
curl https://fussballmanager.<dein-subdomain>.workers.dev/api/health
curl -I https://fussballmanager.<dein-subdomain>.workers.dev/
```

Im Browser: URL öffnen → Pipeline → **Next** / Match testen.

---

## Schritt 5 — Worker-Namen anpassen (optional)

In `worker/wrangler.toml`:

```toml
name = "fc-tycoon-demo"   # muss global eindeutig sein
```

Danach erneut `npm run deploy:cloudflare`.

---

## Schritt 6 — Eigene Domain

1. Domain in Cloudflare als Zone hinzufügen (Nameserver umstellen).
2. **Workers & Pages** → Worker `fussballmanager` → **Settings** → **Domains & Routes**
3. **Add** → `game.deinedomain.de` (oder Subdomain deiner Wahl)
4. DNS-Eintrag wird automatisch gesetzt (Proxied orange cloud).

Fertig — keine `_redirects` oder separater Pages-Deploy nötig.

---

## Schritt 7 — Spielstände zwischen lokal und Cloudflare

1. Lokal spielen → **⋮ → Spielstände → Export**
2. Auf `https://game.deinedomain.de` → **Import → Slot 1**

Gleicher JSON-Stand, gleiche Seeds.

---

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy-cloudflare.yml`

Bei jedem **Push auf `main`** (oder manuell unter **Actions → Deploy Cloudflare → Run workflow**):

1. **verify** — `npm ci` → typecheck → test → build
2. **deploy** — `npm run deploy:cloudflare` (nur wenn verify grün)

### Secrets einrichten (einmalig)

GitHub → Repo → **Settings** → **Secrets and variables** → **Actions**:

| Name | Typ | Wert |
|------|-----|------|
| `CLOUDFLARE_API_TOKEN` | **Secret** (Pflicht) | Custom token (siehe unten) oder Template **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | **Variable** oder Secret | `cd worker && npx wrangler whoami` → Account ID |

**Empfohlen für CI (Custom Token):**

1. Cloudflare → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**
2. **Permissions:** `Account` → `Workers Scripts` → **Edit**
3. **Account Resources:** *Include* → dein Account (`815ca2f9…` o. ä.) — **nicht** auf einen einzelnen Worker beschränken, wenn der Worker noch nicht existiert
4. Token kopieren → GitHub Secret `CLOUDFLARE_API_TOKEN`

> Erster Deploy eines neuen Workers (inkl. Static Assets) braucht **Account-weites** Workers Scripts Edit. Ein Token, der nur auf einen bestehenden Worker scoped ist, schlägt bei `assets-upload-session` mit *No access to the specified resource* fehl.

> **Wichtig:** Der API-Token gehört unter **Secrets**, nicht unter **Variables** — Variables sind öffentlich lesbar im Workflow-Log-Kontext und Wrangler erwartet `CLOUDFLARE_API_TOKEN` als Secret.

Danach: Push auf `main` → **Actions** → Workflow „Deploy Cloudflare“.  
Wenn **verify** rot ist, läuft **deploy** nicht (auch bei korrekten Secrets).

Manuell erneut starten: **Actions → Deploy Cloudflare → Run workflow**.

---

## Architektur

```text
Browser
  └── https://game.deinedomain.de
        └── Cloudflare Worker (Hono)
              ├── /api/*     → Match-Engine (aus server/src/)
              └── /*         → dist/ (Vite SPA)
```

Konfiguration: `worker/wrangler.toml` — `run_worker_first` schickt nur `/api/*` und `/health` durch den Worker; alles andere kommt aus `dist/`.

---

## Troubleshooting

| Problem | Lösung |
|--------|--------|
| `Match-Server nicht erreichbar` | `/api/health` im Browser prüfen; Worker-Deploy wiederholen |
| `npm run build` schlägt fehl | `npm ci` im Root, Node 22 |
| Worker-Name vergeben | `name` in `wrangler.toml` ändern |
| CPU timeout bei Matchday | Cloudflare Paid Plan oder kürzere Test-Matchdays; Einzelmatches sind meist OK |
| Alter Stand nach Deploy | Hard-Refresh (Cache) oder Worker-Version in Dashboard prüfen |
| `Invalid format for Authorization header` (6111) | `CLOUDFLARE_API_TOKEN` neu anlegen: nur den Token-String einfügen (kein `Bearer`, keine Anführungszeichen, kein Zeilenumbruch). Muss ein **API Token** sein, nicht der Global API Key. |
| `Authentication failed` (9106) | Token mit Template **Edit Cloudflare Workers** erstellen; Account im Token auf dein Konto beschränken; Secret in GitHub **Secrets** (nicht Variables) speichern |
| `assets-upload-session` / *No access to the specified resource* | Token braucht **Workers Scripts → Edit** auf dem **gesamten Account**, nicht nur einen Worker. Custom Token neu anlegen (siehe Tabelle oben). Alternativ einmal lokal `npm run deploy:cloudflare` nach `wrangler login` |

---

## Was nicht auf dem Worker läuft

- **Savegame-Ordner-API** (`/api/save/*`) — braucht Dateisystem; im Spiel nicht nötig (localStorage).
- **PostgreSQL / `persist-match` CLI** — nur lokal mit Docker.

Docker-Deploy (`docker compose up`) bleibt Alternative für VPS/Hetzner.
