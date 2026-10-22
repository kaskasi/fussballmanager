# /docs/prd/26_club_kits.md

**Version:** 1.0  
**Last Updated:** 2026-10-16  
**Status:** Final (v2 — Heimtrikot auf faces.js-Portraits)

---

## Purpose

Spieler-Portraits sollen den **Verein visuell erkennbar** machen: Alle Profis eines Clubs tragen dasselbe **Heimtrikot** auf dem faces.js-Portrait (v2, Oktober 2026; v1 färbte Open-Peeps-Busts um). Kein separates Trikot-Asset, keine Sponsoren — faces.js zeichnet das Trikot aus drei Teamfarben.

---

## Scope v1

**In:**

- `WorldClub.kit`: `{ primary, secondary }` (Hex), deterministisch aus `world_seed` + Club-Index
- Spieler-Club (Kieler FC / Nordstern): `primary = #2e9e46` (`design.md` / `--rasen`)
- `PlayerPortrait` gibt faces.js `teamColors = [kit.primary, kit.secondary, weiß]`, wenn `clubId` (Career-`club_id`) gesetzt ist
- Migration für bestehende Saves (`save_version` bump)

**Out (v1):**

- Auswärts-/Dritt-Trikot, Streifen, Kragen, Nummern, Badges
- Trikot-Editor für den Manager
- Match-Pitch-Spieler-Dots (separates Feature)
- Staff-Portraits (`pool: mixed`) ohne Vereinsbindung — neutrales graues Shirt

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

1. `faceFromSeed({ seed, nationality, pool, teamColors })` in `src/ui/portraits/face-from-seed.ts` erzeugt die faces.js-Konfiguration (geseedeter Zufall, Cache).
2. Wenn Kit bekannt: `teamColors` aus `PortraitKitProvider` (Map `careerClubId → [primary, secondary, weiß]` aus `session.world.clubs`); sonst neutrales Grau.
3. Silhouette-Variante (unbekannte Scouting-Spieler): kein Gesicht, kein Trikot.

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
