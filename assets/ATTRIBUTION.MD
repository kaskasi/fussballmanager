# Asset attribution (shipped / source packs)

**Principle:** Prefer **CC0 / open source** when choosing art (auditable, share-friendly). Use **documented commercial or Commons licenses** when they clearly improve the product — every file here has a source and license row. Goal: a game real people want to play, not license purity over polish.

## Kenney.nl

- **License:** CC0 1.0 (Public Domain)
- **Source:** https://www.kenney.nl
- **Location:** `assets/kenney.nl/*.zip` (source packs; read-only)
- **Shipped in game:** None until remapped and baked to `public/assets/kenney/` per `docs/prd/design.md` §2 and `assets/kenney-color-map.json`
- **Optional credit:** Kenney.nl

## Open Peeps

- **License:** CC0 1.0 Universal
- **Author:** Pablo Stanley
- **Source:** https://www.openpeeps.com/
- **Location:** `assets/open-peeps/` (full vendor pack; read-only)
- **Shipped in game:** Bust subset `public/assets/portraits/bust/peep-1.svg` … `peep-105.svg` baked from `Flat Assets/Templates/Bust/` via `npm run bake:portraits` (Flat source, token-aligned recolor: tinte ink, warm skin, rasen-hell on kit bodies); catalog `src/ui/portraits/portrait-bust-catalog.json` (`mens_squad` / `mixed` / `womens_squad` pools); unknown-scout placeholder `public/assets/portraits/silhouette.svg` (game-authored)

## ambientCG textures

All downloads CC0 1.0 — https://docs.ambientcg.com/license/

Optional credit: `Created using <name> from ambientCG.com, licensed under CC0 1.0.`

| Asset ID | File(s) in repo | URL |
| --- | --- | --- |
| Paper003 | `assets/textures/ambientcg/Paper003_*-JPG.zip` | https://ambientcg.com/a/Paper003 |
| Grass005 | `assets/textures/ambientcg/Grass005_*-JPG.zip` | https://ambientcg.com/a/Grass005 |
| Ground057 | `assets/textures/ambientcg/Ground057_*-JPG.zip` | https://ambientcg.com/a/Ground057 |
| Ground079S | `assets/textures/ambientcg/Ground079S_*-JPG.zip` | https://ambientcg.com/a/Ground079S |
| Wood066 | `assets/textures/ambientcg/Wood066_1K-JPG.zip` | https://ambientcg.com/a/Wood066 |

**Git policy:** Only **1K** ZIPs are committed (~33 MB total). `2K`/`4K` ZIPs stay local (see `.gitignore`) — CC0, free to re-download from ambientCG.

**Shipped tiles:** `public/assets/textures/paper003-color.jpg`, `public/assets/textures/wood066-color.jpg` (from 1K Color JPGs via `npm run bake:hub-photos` / manual extract).

**Hub / economy photos (shipped):** `public/assets/photos/hub-office.jpg`, `hub-stadium-dusk.jpg`, `commerce-kiosk.jpg`, `transfer-tunnel.jpg`, `youth-campus-aerial.jpg` — sources and licenses in `pd_images/image_refs.md`; bake via `npm run bake:hub-photos`.

**UI paper tile (shipped):** `public/assets/textures/paper003-color.jpg` — scout map, chronicle, help credits (ambientCG Paper003, CC0).

## Magnific (stock photos)

- **Source:** https://www.magnific.com/
- **Files:** `pd_images/blured-photo-audience-peoples-cinema.jpg`, `pd_images/side-view-man-walking-rows.jpg`
- **Allowed:** personal/commercial, digital/print, modify, unlimited use worldwide.
- **Not allowed:** sublicense or sell/rent the asset; redistribute the original file for download; use in logos/trademarks; claim ownership of the original design.
- **Attribution (required when shipped):** clear and visible — for this **game**, list in the in-app **Credits** section (and next to the image if it appears in UI). Link to https://www.magnific.com/
- **Example:** `Photo from Magnific (https://www.magnific.com/)`

Full placement rules: Magnific license docs (website footer, app credits, etc.).

## Canva — fictional club crests

- **Policy:** [Canva Content License Agreement](https://www.canva.com/policies/content-license-agreement/) (and applicable Canva Terms of Use at time of export).
- **Account:** Jan — Canva signup **2026-10-06**; logo designs **downloaded as PDF from Canva** after signup (same session / immediately after).
- **Repo pipeline:** Canva PDF export → SVG via [PDF24](https://tools.pdf24.org/) (format conversion only; **no license** from PDF24) → `assets/club_logos/*.svg` (~90 files).
- **Product use:** Crests for **fictional** generated-world clubs only (UI e.g. calendar, tables, `ClubCrest` when wired). **Not** real club trademarks; **not** registered as product or club trademarks.
- **Allowed (typical Canva Content License):** Use in this **commercial game** end product; modify/recolor for in-game display.
- **Not allowed (maintainer must respect):** Redistribute Canva designs as a **standalone template/logo pack** (including “free logo download” for third parties); sell or sublicense the **source** designs separately from the game; use in a way that implies Canva endorsement; trademark the exported artwork.
- **Subscription:** Exports must comply with the Canva plan and element library **in effect when each design was downloaded** (Pro-only template elements require a Pro-eligible export at that time). Keep export date **2026-10-06** on record for this batch.
- **Shipped in game:** Not yet — target baked slugs under `public/assets/club-logos/` + catalog (see P2 plan); until then sources stay in `assets/club_logos/`.
- **Player-facing credit (when shipped):** Optional but recommended in Help/Credits, e.g. `Club crests: designs exported from Canva (canva.com), used under the Canva Content License.` — Canva does not require attribution for most Content uses; we list it for transparency alongside Commons/Magnific.
- **Audit:** Replace or re-export any file that mixed **user uploads** into Canva without rights; prefer outlined SVG (no live Canva fonts) after PDF24 conversion.

## Photography (Wikimedia / other)

See `pd_images/image_refs.md` per file (Commons / Flickr / USGov / etc.).
