# /docs/prd/26_club_kits.md

**Version:** 1.0  
**Last Updated:** 2026-10-16  
**Status:** Final (v1 — Heimtrikot auf Bust-Portraits)

---

## Purpose

Spieler-Busts sollen den **Verein visuell erkennbar** machen: Alle Profis eines Clubs tragen dieselbe **Heim-Shirtfarbe** auf dem Open-Peeps-Portrait. Kein separates Trikot-Asset, keine Sponsoren — nur Recolor der bestehenden Shirt-Layer.

---

## Scope v1

**In:**

- `WorldClub.kit`: `{ primary, secondary }` (Hex), deterministisch aus `world_seed` + Club-Index
- Spieler-Club (Kieler FC / Nordstern): `primary = #2e9e46` (`design.md` / `--rasen`)
- Laufzeit-Recolor beim Rendern von `PlayerPortrait`, wenn `clubId` (Career-`club_id`) gesetzt ist
- Shirt-Layer-Regeln analog `scripts/portrait-bake-lib.mjs`, erweitert um `mens_allowed_bodies` aus `portrait-bust-catalog.json`
- Migration für bestehende Saves (`save_version` bump)

**Out (v1):**

- Auswärts-/Dritt-Trikot, Streifen, Kragen, Nummern, Badges
- Trikot-Editor für den Manager
- Match-Pitch-Spieler-Dots (separates Feature)
- Staff-Portraits (`pool: mixed`) ohne Vereinsbindung — neutrales Bake-Grün bleibt

---

## Datenmodell

```typescript
interface WorldClub {
  // … bestehend …
  kit: {
    primary: string;   // #RRGGBB Heim-Shirt
    secondary: string; // #RRGGBB Reserve (Crest/Auswärts später)
  };
}
```

Spieler: `player.club_id` (Career-ID, z. B. `cl_fc_nordstern`) → Lookup über `worldCareerClubId(club.id)`.

---

## Rendering

1. Basis-URL wie bisher: `portraitUrlFromSeed(seed, pool)`.
2. Wenn Kit bekannt: SVG fetchen (Cache pro Bust-URL), `PORTRAIT_ACCENT` (#bfdec2) und erste Shirt-`fill` (#e8c4a8) in `body/*`-Gruppen durch `kit.primary` ersetzen.
3. Silhouette-Variante: **kein** Kit-Recolor.

`PortraitKitProvider` hält Map `careerClubId → primary` aus `session.world.clubs`.

---

## Akzeptanz

- Eigener Kader: alle Busts gleiche Rasen-Grün-Shirtfarbe.
- Fremder Verein (Transferliste, Scouting, Match-Report): Shirt = dessen `kit.primary`.
- Gleicher `portrait_seed`, andere Vereinsfarbe: nur Shirt ändert sich, Kopf/Haut unverändert.
- Kein Kit ohne `clubId` an `PlayerPortrait` (Staff, Silhouette).

---

## Tests

- `deriveClubKitColors`: deterministisch, Spieler-Club fix Rasen.
- `recolorPortraitSvgShirt`: Accent → custom hex; mindestens ein `mens_squad`-Bust-Fixture.

---

## Referenzen

- PRD 12 (Welt/Clubs), PRD 20 / `design.md` (Tokens)
- `scripts/portrait-bake-lib.mjs`, `src/ui/portraits/portrait-bust-catalog.json`
