# /docs/prd/20_design_language.md

**Version:** 1.2  
**Last Updated:** 2026-10-22  
**Status:** Draft (implementation in progress)

---

## Purpose

Establish **one visual and implementation language** for The Club UI: shared tokens, reusable primitives, localization rules, and coherent imagery — so screens feel “aus einem Guss” and Lumo-style SaaS/spreadsheet drift is reversed.

**In:** CSS architecture, component library contracts, screen audit checklist, i18n gate, camp hero imagery policy.

**Out:** Gameplay/sim changes, PRD 19 narrative beats, generative image AI (PRD 01).

**Dependencies:** [design.md](./design.md) (vision), PRD 09, 14, 18, 19.

---

## Relationship to design.md

| Document | Role |
|----------|------|
| **design.md** | "Rasen" (The Club design system): token roles, club-colour title bar, header/menu law, wireframes §9, yellow rule, typography |
| **PRD 20 (this file)** | How to **build and migrate**: cascade order, primitives, audits, DoD, phased deletion of legacy CSS |

On conflict for **tokens/header/yellow**: design.md wins. On conflict for **which component to use**: PRD 20 wins.

---

## Single CSS control plane

### Canonical tokens

Only [`src/ui/design/design-tokens.css`](../../src/ui/design/design-tokens.css) may define:

- Colour roles (`--page`, `--panel`, `--text`, `--accent`, `--next`, `--club`, status, ratings, newsprint) and the legacy aliases that point at them
- Typography (`--font-display`, `--font-text`, `--font-news`, `--font-masthead`, `--font-size-xs` … `--font-size-masthead`) and the self-hosted `@font-face` rules
- Radii, shadows, sizes
- Spacing scale (`--space-1` … `--space-12`, N × 4px)
- Shell layout (`--club-header-height`, `--club-shell-inset`, …)
- The dark theme (`[data-theme="dark"]`, Flutlicht)

**Rule:** No new hex/rgb/hsl or literal `font-size` in CSS or TSX except this file. Enforced by `npm run check:design-tokens` against `scripts/design-tokens-baseline.json` (CI, ratchet: counts may only go down). Colour data in `.ts` files (kits, portrait recolor) is out of scope.

### Target cascade (end state)

```text
design-tokens.css
  → screen-layout.css   (breakpoints, hub grid)
  → game-surfaces.css   (screens, primitives, modals)
  → (minimal route overrides only)
```

**Retire:** duplicate rules in `index.css`; shrink `design-repair.css` to zero by migrating into tokens/game-surfaces.

**Current import order** (`main.tsx`): design-tokens → global-base → **components** (`tc-`) → screen-layout → game-surfaces → surfaces/* → presentation-modes → **index.css** → mobile-pass → design-repair. Migration goal: screens move to `tc-` components and lose their `index.css` rules.

### Breakpoints (single table)

| Name | Min width | Use |
|------|-----------|-----|
| mobile | 0 | 390px audit (PRD 09), touch ≥44px |
| mobile-wide | 480px | `screen-layout.css` stack rules |
| tablet | 720px | camps 2-col, hub stack |
| desktop | 1024px | three-column hub |
| wide | 1280px | optional max-width |

### Presentation modes (`career_phase` / `world_profile`)

One component library; **two density skins** via tokens + layout class on `document` or shell root — no second CSS fork per screen.

| Mode | CSS hook (proposed) | When | Visual intent |
|------|---------------------|------|----------------|
| `storybook` | `data-presentation="storybook"` | PRD 19 Acts 1–3, opening storyboard POC | Fernsehnachmittag: warm panels, optional comic panels, more whitespace |
| `manager_desk` | `data-presentation="manager_desk"` | `full`, `act3_empire`, `elite_world` (PRD 21) | FM-lean: tighter tables, less illustration chrome, same `FilterChip` / `StatTable` |

**Rule:** Switching mode changes **spacing, type scale, decorative borders** — not business logic. Map in [`resolveCareerPresentation`](../../src/narrative/career-presentation.ts) when implemented.

**External review (2026-10-08):** Elite / long-run play benefits from spreadsheet density; underdog arc may keep comic storyboard beats (see `docs/research/storyboard-opening-poc.md`).

### Anti-patterns (documented bugs)

- **Filter active state using `--sonnengelb` / `--accent-primary`** — violates design.md §1; use `--rasen` + `--tinte` text.
- **Raw `#fff` panels** — use `var(--panel)`.
- **Duplicate chip classes** (`.squad-sort-chip` vs `.scouting-chip` in index + game-surfaces) — use `FilterChip` primitive.

---

## Component library

Location: [`src/ui/components/primitives/`](../../src/ui/components/primitives/) — import via barrel `index.ts`; do not copy markup.

### FilterChip / FilterToolbar

| Prop | Type | Notes |
|------|------|-------|
| `active` | boolean | `aria-pressed` |
| `onClick` | fn | |
| `children` | ReactNode | localized label |
| `size` | `default` \| `dense` | optional |
| `title` | string | optional |

**Tokens:** `--panel`, `--outline`, `--radius-chip`, active `--rasen`.

**Replaces:** `.squad-sort-chip`, Scouting local `Chip`, duplicate CSS.

**i18n:** toolbar `aria-label` from `*.filter.aria` keys.

### ModalShell

| Prop | Type | Notes |
|------|------|-------|
| `ariaLabel` | string | `aria-label` on dialog |
| `title` | ReactNode | optional visible header |
| `onClose` | fn | |
| `closeOnBackdrop` | boolean | default true |
| `showCloseButton` | boolean | default true |
| `panelClassName` | string | e.g. `postfach-expand-modal` |
| `children` | ReactNode | body (scroll: `surface-scrollbar`) |

**Behavior:** `createPortal` to `document.body`; `.modal-backdrop` z-index 110; header dimmed via existing shell rules.

**Wireframe:** design.md §9 modals; PRD 14 Postfach expand.

### TabBar (phase 2)

Unify `fm-tab-bar`, leagues tabs — one active indicator token (`--rasen` underline or fill). Spec TBD in follow-up PR.

### ScreenPanel (phase 2)

Maps `.game-panel` padding/outline to one class or thin wrapper.

### StatToken (phase 2)

Icon + value row for CA/fit tokens on scout/youth tiles.

---

## Screen audit checklist (layout pass)

For each screen (Hub → Youth → Scouting → Training → Finances → Stadium → Postfach modals):

- [ ] Page background `--bg-page` / `--bg-sand` only
- [ ] Panels use `--panel` + `--outline`
- [ ] Filters use `FilterChip`
- [ ] Modals use `ModalShell` (or documented exception)
- [ ] User-visible strings via `t()` / `useT()`; DE/EN/简体 keys same PR
- [ ] `aria-label` / `aria-labelledby` localized
- [ ] No yellow except header NEXT
- [ ] Touch targets ≥44px at 480px

Sign-off: optional PNG in `docs/design-refs/`.

---

## i18n gate (F12.8, PRD 18)

1. Every new UI string: add to `de.json`, `en.json`, `zh-Hans.json`.
2. Backlog hygiene: avoid German literals in `src/ui/**/*.tsx` (labels, `aria-label`, placeholders).
3. **CI note:** `npm run check:ui-aria-i18n` — P0 screens + primitives; set `CHECK_UI_ARIA_I18N_FULL=1` for whole `src/ui` with `scripts/ui-aria-i18n-allowlist.txt`.

Shared keys: `shell.modal.close`, `scouting.filter.all`, `youth.filter.aria`, etc.

---

## Imagery — youth camps (PRD 03.6.1)

**Problem:** CC0 landscape JPGs read “stock photo” against cartoon portraits and comic UI (Lumo).

**Default (PRD 20 v1):** Nation hero = **CSS gradient** from [`campPhotoGradient`](../../src/ui/assets/camp-photos.ts) — no shipped JPG required.

**Optional upgrade:** hand-authored SVG landscapes or CC0 **illustration** (flat/poster), baked like club logos; document in `docs/ATTRIBUTION.md`.

**Allowed:** vector tools, SVG, CSS, non-generative color grading of CC0 stills.

**Forbidden:** generative image AI in shipped assets (PRD 01).

---

## Program gates

### PRD 19 (career acts)

**Dependency:** PRD 20 **P0–P2 DoD** before PRD 19 slices **B–E** (onboarding panel, training banner, story inbox chrome, Act 2 unlock UI). Slice A (`career_phase` curtain) may ship earlier but must not add new ad-hoc chip/modal styles.

### Not a feature ID

UI system work does not add rows to PRD 10; tracked here and in PRD 15 gap notes.

---

## Definition of Done (PRD 20 program)

| # | Criterion |
|---|-----------|
| 1 | `FilterChip` on Youth, Squad, Scouting — visual parity, active = green |
| 2 | `ModalShell` on Postfach expand, Opening (backdrop policy documented), Sponsor deal |
| 3 | Scouting filter active state not yellow |
| 4 | Camp cards default to gradient hero (no JPG in runtime path) |
| 5 | P0 screens: critical hard-coded DE strings migrated (youth filter, shared aria) |
| 6 | PRD 03.6.1 + design.md cross-links updated |

---

## Implementation phases

| Phase | Deliverable |
|-------|-------------|
| P0 | FilterChip + CSS `.filter-chip` |
| P1 | ModalShell + 3 modal migrations |
| P2 | i18n P0 sweep + CI grep doc |
| P3 | Camp gradient default |
| P4 | `index.css` deletion campaign (ongoing) |
| F0 | **Foundations (2026-10):** role tokens + legacy aliases, Sofia Sans self-hosted, club-colour title bar (`titleBarColors`), `components.css` (`tc-`), UI gallery (`?ui=gallery`), `check:design-tokens` ratchet in CI |
| F1 | Page-by-page migration to `tc-` components (suggested order: Leagues → Squad → Player profile → Transfers → Hub); each PR lowers the baseline. **Leagues done** (table, leaders, club profile modal; `ModalShell variant="tc"`). **Squad done** (roster, mentoring, staff; shared screen tabs, `FilterChip` and `SquadSortHeader` moved to tc for every screen). **Player profile done** (identity rail, overview / history / season stats, contract talk and sale modals on `ModalShell variant="tc"`; portraits via faces.js). **Transfers done** (market cards, contract talks, loans, history, negotiation modal; cash formatted per language everywhere). **Hub token pass done** (roles and type scale only, no yellow outside Next; panel markup still legacy). **Finances done** (six tabs on tc, chart series tokens `--series-1…6`, bank and tickets localized). **Stadium done** (stat strip, pitch plan with sector detail, new Ausbau tab, sponsor modal on tc; `tc-stepper`; precinct editor keeps its structure with role tokens and full EN/DE/ZH). **Calendar done** (season strip in season order, lived days crossed off, results on matchdays, chronicle column with results, transfers, Der Treter and chronicle; transfer windows from season weeks) |
| F2 | Der Treter on `tc-news` with self-hosted Newsreader + UnifrakturMaguntia |
| F3 | Dark theme switch in Settings (needs legacy aliases gone from migrated screens) |

---

## References

- [design.md](./design.md) §2.1, §4.1, §12
- [19_career_acts.md](./19_career_acts.md)
- [21_career_act4_elite_world.md](./21_career_act4_elite_world.md)
- [playtest_protocol.md](./playtest_protocol.md)
- [18_localization.md](./18_localization.md)
- Lumo: [docs/lumo/OPEN_ISSUES.md](../lumo/OPEN_ISSUES.md)
