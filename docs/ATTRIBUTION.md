# Credits & asset licenses (player-facing summary)

**In-game summary:** Help → **Credits** / **Danksagung** (Attribution tab). This file and [assets/ATTRIBUTION.MD](../assets/ATTRIBUTION.MD) remain the maintainer source of truth.

We **prefer CC0 and open licenses wherever possible** (Kenney, ambientCG, Commons with attribution, faces.js). Where that is not enough for a credible, shippable game, we also use **other documented licenses** (Canva Content License, Magnific, etc.) — all listed below and in [assets/ATTRIBUTION.MD](../assets/ATTRIBUTION.MD). No generative AI artwork (see [docs/prd/01_vision.md](prd/01_vision.md)).

| Kind | Credit |
| --- | --- |
| Stadium / matchday photos | Wikimedia Commons & other sources — see [pd_images/image_refs.md](../pd_images/image_refs.md) |
| Hub & commerce mood photos | Commons / Geograph — office (Estormiz), stadium dusk (Erik Drost, CC-BY), ticket office, tunnel — see `image_refs.md` |
| Youth campus mood (optional band) | Wikimedia — auxiliary pitch aerial (Wrocław); see `image_refs.md` → `youth-campus-aerial.jpg` |
| Scout map / chronicle paper | [Paper003 from ambientCG.com](https://ambientcg.com/a/Paper003) (CC0) — tiled UI chrome |
| Scout region flavor photos | Wikimedia Commons — Eider, Flensburger Förde, Schloss moat, Bremen Rathaus; see [pd_images/image_refs.md](../pd_images/image_refs.md) (`SCOUTING_REGION_*`) → `public/assets/scout-maps/flavor/` |
| Scout relief base map (optional) | [Relief map of Germany](https://commons.wikimedia.org/wiki/File:Relief_Map_of_Germany.svg) (TUBS, CC BY-SA 3.0) — source in `pd_images/` |
| Banden board texture | [Wood066 from ambientCG.com](https://ambientcg.com/a/Wood066) (CC0) — `public/assets/textures/wood066-color.jpg` |
| Magnific stock (when used) | Photo from [Magnific](https://www.magnific.com/) |
| Player and staff portraits | [faces.js](https://github.com/zengm-games/facesjs) by ZenGM (Apache License 2.0) — drawn at runtime from `portrait_seed` in the club's kit colours (`src/ui/portraits/face-from-seed.ts`); licence text in `node_modules/facesjs/LICENSE`. Replaced Open Peeps (CC0) busts in October 2026 |
| Kenney tiles / patterns / icons (when shipped) | [Kenney.nl](https://www.kenney.nl) (CC0) — remapped only; source zips in `assets/kenney.nl/` |
| UI paper texture | [Paper003 from ambientCG.com](https://ambientcg.com/a/Paper003) (CC0) — `public/assets/textures/paper003-color.jpg` |
| Browser favicon & PWA icons | Project-authored SVG/PNG (`public/favicon.svg`, `public/apple-touch-icon.png`) — Nordstern mark, design tokens §2 |
| Fictional club crests (when shipped) | Designs exported from [Canva](https://www.canva.com/) (2026-10-06 batch), [Content License Agreement](https://www.canva.com/policies/content-license-agreement/) — fictional clubs only; sources in `assets/club_logos/` |
| UI fonts | [Sofia Sans and Sofia Sans Condensed](https://github.com/lettersoup/Sofia-Sans) by Lettersoup (SIL Open Font License 1.1) — self-hosted latin and latin-ext subsets in `public/fonts/`, licence in `public/fonts/OFL.txt` |
| Storyboard opening POC (dev only) | Project-authored SVG via `npm run bake:storyboard-poc` — see `docs/design-refs/storyboard-opening-poc/ATTRIBUTION.md` |

Full maintainer inventory: [assets/ATTRIBUTION.MD](../assets/ATTRIBUTION.MD).
