/**
 * Developer UI gallery (design.md §4): every `tc-` component and the foundations on one page.
 * Opened from Settings → Developer, or with `?ui=gallery`. Fixture text is English on purpose:
 * this page is for building screens, players never see it.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PressGallerySample } from "./PressGallerySample.tsx";
import { Check, Minus, Plus, X } from "lucide-react";
import { titleBarColors, type KitColors, type TitleBarTheme } from "../shell/title-bar-colors.ts";
import { ratingBand } from "../design/rating-band.ts";
import { LeagueTable, LeagueZoneLegend } from "../components/LeagueTable.tsx";
import { PortraitSamples } from "./PortraitSamples.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { PortraitKitProvider } from "../portraits/PortraitKitContext.tsx";
import { DEFAULT_GENERATED_WORLD } from "../../sim/league-divisions.ts";
import { NORDSTERN_TEAM_ID, worldCareerClubId } from "../../world/world-generator.ts";
import { galleryLeague, SAMPLE_KITS } from "./ui-gallery-fixtures.ts";
import "./ui-gallery.css";

const COLOR_ROLES: { group: string; tokens: string[] }[] = [
  { group: "Ground", tokens: ["page", "panel", "sunken"] },
  { group: "Lines", tokens: ["line", "line-strong", "control-border"] },
  { group: "Text", tokens: ["text", "text-muted"] },
  { group: "Action", tokens: ["accent", "accent-strong", "accent-soft", "next", "club"] },
  { group: "Status", tokens: ["positive", "negative", "warning", "info", "draw"] },
  { group: "Ratings", tokens: ["rating-1", "rating-2", "rating-3", "rating-4", "rating-5"] },
  { group: "Der Treter", tokens: ["newsprint", "newsprint-ink", "newsprint-rule", "newsprint-kicker"] },
];

const TYPE_STYLES: { name: string; className: string; sample: string }[] = [
  { name: "display · 32/36 · 800", className: "ui-gallery__type--display", sample: "Kieler FC" },
  { name: "title · 24/28 · 800", className: "ui-gallery__type--title", sample: "Squad · 26 players" },
  { name: "heading · 20/24 · 700", className: "ui-gallery__type--heading", sample: "Kerem Yılmaz" },
  { name: "body · 16/24", className: "ui-gallery__type--body", sample: "The board expects a top-half finish." },
  { name: "body-sm · 14/20", className: "ui-gallery__type--body-sm", sample: "CF · 15 · Istanbul camp" },
  { name: "label · 12/16 · 700", className: "tc-label", sample: "Matchday 11" },
];

const SPACE_STEPS = [1, 2, 3, 4, 6, 8, 12] as const;


type SquadRow = { id: string; name: string; pos: string; age: number; ca: number; delta: number };

const SQUAD: SquadRow[] = [
  { id: "kerem", name: "Kerem Yılmaz", pos: "CF", age: 15, ca: 116, delta: 1.2 },
  { id: "mateusz", name: "Mateusz Wójcik", pos: "CF", age: 15, ca: 104, delta: 0.9 },
  { id: "jonas", name: "Jonas Brandt", pos: "CB", age: 24, ca: 92, delta: 0 },
  { id: "felix", name: "Felix Wolf", pos: "CB", age: 15, ca: 78, delta: 1 },
  { id: "lukas", name: "Lukas Petersen", pos: "GK", age: 31, ca: 88, delta: -0.4 },
  { id: "noah", name: "Noah Richter", pos: "CM", age: 16, ca: 99, delta: 0.7 },
  { id: "anton", name: "Anton Wagner", pos: "RB", age: 15, ca: 64, delta: 0.8 },
];

const POSITIONS = ["All", "GK", "CB", "RB", "CM", "CF"] as const;

type SortKey = "name" | "age" | "ca" | "delta";


const KIELER_FC = worldCareerClubId(NORDSTERN_TEAM_ID);

function MenuIcon() {
  return (
    <svg className="tc-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}


function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="ui-gallery__section" aria-labelledby={`ui-gallery-${id}`}>
      <h2 className="ui-gallery__section-title" id={`ui-gallery-${id}`}>
        {title}
      </h2>
      {note ? <p className="ui-gallery__note">{note}</p> : null}
      {children}
    </section>
  );
}

function TitleBarSample({ name, initials, kit, theme }: { name: string; initials: string; kit: KitColors; theme: TitleBarTheme }) {
  const colors = titleBarColors(kit, theme);
  const style = { "--club": colors.club, "--on-club": colors.onClub } as CSSProperties;
  const fromKit = colors.club === kit.primary ? "primary" : colors.club === kit.secondary ? "secondary" : "ink fallback";
  return (
    <figure className="ui-gallery__titlebar-sample">
      <header className="tc-titlebar" style={style}>
        <span className="tc-titlebar__crest ui-gallery__crest">{initials}</span>
        <p className="tc-titlebar__club">{name}</p>
        <span className="tc-titlebar__cash">€3.35M</span>
        <button className="tc-iconbtn" type="button" aria-label="Menu">
          <MenuIcon />
        </button>
        <button className="tc-next" type="button">
          Next
        </button>
      </header>
      <figcaption className="tc-caption">
        Kit {kit.primary} / {kit.secondary} → bar {colors.club} ({fromKit}), text {colors.onClub}
      </figcaption>
    </figure>
  );
}

export function UiGallery() {
  const [theme, setTheme] = useState<TitleBarTheme>("light");
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("All");
  const [sort, setSort] = useState<{ key: SortKey; dir: "ascending" | "descending" }>({ key: "ca", dir: "descending" });
  const [tab, setTab] = useState("Squad");
  const [modalOpen, setModalOpen] = useState(false);
  const league = useMemo(() => galleryLeague(), []);

  useEffect(() => {
    document.title = "UI gallery · The Club";
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const rows = useMemo(() => {
    const filtered = position === "All" ? SQUAD : SQUAD.filter((row) => row.pos === position);
    const factor = sort.dir === "ascending" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "string" ? av.localeCompare(String(bv)) : av - Number(bv)) * factor;
    });
  }, [position, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "ascending" ? "descending" : "ascending" }
        : { key, dir: key === "name" ? "ascending" : "descending" },
    );

  const sortHeader = (key: SortKey, label: string, numeric: boolean) => (
    <th scope="col" className={numeric ? "tc-num" : undefined} aria-sort={sort.key === key ? sort.dir : undefined}>
      <button className="tc-sort" type="button" onClick={() => toggleSort(key)}>
        {label}
        {sort.key === key ? (
          <svg className="tc-sort__arrow" viewBox="0 0 10 10" aria-hidden="true">
            <path d={sort.dir === "descending" ? "M1 3h8L5 8z" : "M1 7h8L5 2z"} />
          </svg>
        ) : null}
      </button>
    </th>
  );

  return (
    <PortraitKitProvider worldClubs={DEFAULT_GENERATED_WORLD.clubs}>
    <div className="ui-gallery" data-theme={theme}>
      <header className="ui-gallery__head">
        <p className="ui-gallery__brand">The Club · UI gallery</p>
        <div className="tc-chips" role="group" aria-label="Theme">
          {(["light", "dark"] as const).map((value) => (
            <button key={value} className="tc-chip" type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}>
              {value === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <a className="tc-btn tc-btn--ghost" href="./">
          Back to the game
        </a>
      </header>

      <main className="ui-gallery__main">
        <Section id="colour" title="Colour roles" note="Components use roles, never raw values. The dark theme is Flutlicht.">
          <div className="ui-gallery__swatch-groups">
            {COLOR_ROLES.map((group) => (
              <div key={group.group}>
                <p className="tc-label">{group.group}</p>
                <div className="ui-gallery__swatches">
                  {group.tokens.map((token) => (
                    <div key={token} className="ui-gallery__swatch">
                      <span className="ui-gallery__swatch-fill" style={{ background: `var(--${token})` }} />
                      <code>--{token}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="Type" note="Sofia Sans Condensed for display and numbers, Sofia Sans for text.">
          <div className="ui-gallery__stack">
            {TYPE_STYLES.map((style) => (
              <div key={style.name} className="ui-gallery__type-row">
                <span className="tc-caption">{style.name}</span>
                <span className={style.className}>{style.sample}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="space" title="Space and shape" note="--space-N is N × 4px.">
          <div className="ui-gallery__stack">
            {SPACE_STEPS.map((step) => (
              <div key={step} className="ui-gallery__space-row">
                <code>--space-{step}</code>
                <span className="ui-gallery__space-bar" style={{ width: `var(--space-${step})` }} />
              </div>
            ))}
            <div className="tc-row">
              {["sm", "md", "pill"].map((radius) => (
                <span key={radius} className="ui-gallery__radius" style={{ borderRadius: `var(--radius-${radius})` }}>
                  --radius-{radius}
                </span>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="titlebar"
          title="Title bar"
          note="Painted from the club kit. A kit colour is used when text on it reaches 4.5:1 and the Next button still stands out (1.5:1); otherwise the next kit colour, then ink."
        >
          <div className="ui-gallery__stack">
            {SAMPLE_KITS.map((sample) => (
              <TitleBarSample key={sample.name} {...sample} theme={theme} />
            ))}
          </div>
        </Section>

        <Section id="buttons" title="Next and buttons" note="Yellow belongs to Next only. One primary button per view.">
          <div className="tc-row">
            <button className="tc-next" type="button">
              Next{" "}
              <span className="tc-next__count" aria-label="2 blockers">
                2
              </span>
            </button>
          </div>
          <div className="tc-row">
            <button className="tc-btn tc-btn--primary" type="button">
              Sign player
            </button>
            <button className="tc-btn" type="button">
              Compare
            </button>
            <button className="tc-btn tc-btn--ghost" type="button">
              Cancel
            </button>
            <button className="tc-btn" type="button" disabled>
              Over budget
            </button>
            <button className="tc-iconbtn" type="button" aria-label="Menu">
              <MenuIcon />
            </button>
          </div>
        </Section>

        <Section id="filters" title="Filter chips and tabs">
          <div className="tc-chips" role="group" aria-label="Filter squad by position">
            {POSITIONS.map((value) => (
              <button key={value} className="tc-chip" type="button" aria-pressed={position === value} onClick={() => setPosition(value)}>
                {value}
                <span className="tc-chip__count">
                  {value === "All" ? SQUAD.length : SQUAD.filter((row) => row.pos === value).length}
                </span>
              </button>
            ))}
          </div>
          <div className="tc-tabs" role="tablist" aria-label="Squad views">
            {["Squad", "Youth", "Loans", "Staff"].map((value) => (
              <button key={value} className="tc-tab" type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>
                {value}
              </button>
            ))}
          </div>
        </Section>

        <Section id="table" title="Sortable table" note="Click a header to sort. Numbers are right-aligned with tabular figures.">
          <div className="tc-panel">
            <div className="tc-panel__head">
              <div>
                <span className="tc-label">First team</span>
                <h3 className="tc-panel__title">Squad</h3>
              </div>
              <span className="tc-panel__meta">{rows.length} players</span>
            </div>
            <div className="tc-table-wrap">
              <table className="tc-table">
                <caption className="tc-sr">Squad, sorted by {sort.key}</caption>
                <thead>
                  <tr>
                    {sortHeader("name", "Player", false)}
                    <th scope="col">Pos</th>
                    {sortHeader("age", "Age", true)}
                    {sortHeader("ca", "CA", true)}
                    {sortHeader("delta", "Δ week", true)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} aria-selected={row.id === "kerem" ? true : undefined}>
                      <td className="tc-strong">{row.name}</td>
                      <td>{row.pos}</td>
                      <td className="tc-num">{row.age}</td>
                      <td className="tc-num">
                        <span className={`tc-rating tc-rating--${ratingBand(row.ca)}`}>{row.ca}</span>
                      </td>
                      <td className={`tc-num ${row.delta > 0 ? "tc-delta--up" : row.delta < 0 ? "tc-delta--down" : ""}`}>
                        {row.delta > 0 ? "+" : ""}
                        {row.delta.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section
          id="page-head"
          title="Page head"
          note="One per screen: label, display title, one line of context. Leagues is the first screen built from these components."
        >
          <div className="tc-panel">
            <header className="tc-page-head">
              <span className="tc-label">Competition</span>
              <h3 className="tc-page-title">Leagues</h3>
              <p className="tc-page-sub">Click a club for a short profile · Your league live</p>
            </header>
            <div className="tc-tabs tc-tabs--page" role="tablist" aria-label="Divisions">
              <button className="tc-tab" type="button" role="tab" aria-selected="true">
                Regionalliga Nord <span className="tc-tab__meta">your club</span>
              </button>
              <button className="tc-tab" type="button" role="tab" aria-selected="false">
                Oberliga Nord
              </button>
            </div>
          </div>
        </Section>

        <Section
          id="league"
          title="League table"
          note="The real LeagueTable with a seeded mini league. Place badges mark promotion, playoff and relegation; the own club is tinted; club names are link buttons. Form shows the letter and the colour."
        >
          <div className="tc-panel">
            <LeagueTable
              table={league.table}
              leagueSlice={{ club_ids: league.clubIds, results: league.results }}
              playerClubId={league.playerClubId}
              worldClubs={league.worldClubs}
              onSelectClub={() => setModalOpen(true)}
              caption="Gallery league after six rounds"
            />
            <LeagueZoneLegend />
          </div>
          <p className="tc-label">Compact (matchday side panel), both sides of the next match marked</p>
          <div className="tc-panel ui-gallery__narrow">
            <LeagueTable
              table={league.table}
              leagueSlice={{ club_ids: league.clubIds, results: league.results }}
              playerClubId={league.playerClubId}
              worldClubs={league.worldClubs}
              highlightTeamIds={[league.playerClubId, league.table[4]?.teamId ?? league.playerClubId]}
              compact
            />
          </div>
        </Section>

        <Section id="lists" title="Ranked lists and stat tiles" note="Scorers, assists and key players use tc-list; the own club is tinted.">
          <div className="ui-gallery__two">
            <div className="tc-panel">
              <section className="tc-section">
                <h3 className="tc-label tc-section__title">Scorers</h3>
                <ol className="tc-list">
                  {[
                    { name: "Kerem Yılmaz", club: "Kiel", value: 9, own: true },
                    { name: "Deniz Voss", club: "Kaltenkirchen", value: 7 },
                    { name: "Mateusz Wójcik", club: "Kiel", value: 6, own: true },
                  ].map((row, index) => (
                    <li key={row.name} className={`tc-list__item${row.own ? " tc-list__item--own" : ""}`}>
                      <span className="tc-list__rank">{index + 1}</span>
                      <span className="tc-list__main">
                        <span className="tc-list__name">{row.name}</span>
                        <span className="tc-list__meta">{row.club}</span>
                      </span>
                      <span className="tc-list__value">{row.value}</span>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="tc-section">
                <h3 className="tc-label tc-section__title">Cards</h3>
                <p className="tc-empty">No matchday yet — cards follow after kick-off.</p>
              </section>
            </div>
            <dl className="tc-stats">
              {[
                { label: "Fanbase", value: "52", hint: "Attendance index" },
                { label: "Squad strength", value: "98", hint: "Avg. starting XI" },
                { label: "Stadium", value: "KAL-Arena", hint: "8,000 seats" },
                { label: "Coach", value: "Markus Lehmann", hint: "Head coach" },
              ].map((stat) => (
                <div key={stat.label} className="tc-stats__item">
                  <dt className="tc-label tc-stats__label">{stat.label}</dt>
                  <dd>
                    <span className="tc-stat__value">{stat.value}</span>
                    <span className="tc-caption">{stat.hint}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section
          id="forms"
          title="Controls, states and cards"
          note="From Squad and Player profile: select, checkbox rows, range field, icon chips, the ⋮ menu (shown open), state glyphs (shape + colour + word), dense chips and cards inside a panel."
        >
          <div className="ui-gallery__two">
            <div className="tc-panel tc-stack">
              <label className="tc-label" htmlFor="ui-gallery-select">
                Mentor
              </label>
              <select id="ui-gallery-select" className="tc-select" defaultValue="">
                <option value="">— Choose a mentor —</option>
                <option value="a">Karim Koch · leadership 16</option>
              </select>
              <ul className="tc-checks">
                <li>
                  <label className="tc-check">
                    <input type="checkbox" defaultChecked />
                    <span />
                    <span className="tc-check__copy">
                      <span className="tc-check__title">Line-up</span>
                      <span className="tc-check__hint">Picks the starting XI and formation before each matchday</span>
                    </span>
                  </label>
                </li>
                <li>
                  <label className="tc-check">
                    <input type="checkbox" />
                    <span />
                    <span className="tc-check__copy">
                      <span className="tc-check__title">Scouting</span>
                      <span className="tc-check__hint">Keeps assignments going and sets targets</span>
                    </span>
                  </label>
                </li>
              </ul>
              <label className="tc-range">
                <span className="tc-range__head">
                  <span>Wage</span>
                  <strong>€ 2,400/wk</strong>
                </span>
                <input type="range" min={1000} max={4000} defaultValue={2400} />
              </label>
              <div className="tc-stepper">
                <button type="button" className="tc-iconbtn" aria-label="Lower price">
                  <Minus className="tc-icon" aria-hidden />
                </button>
                <output className="tc-stepper__value">€ 12</output>
                <button type="button" className="tc-iconbtn" aria-label="Raise price" disabled>
                  <Plus className="tc-icon" aria-hidden />
                </button>
              </div>
              <div className="tc-chips">
                <button type="button" className="tc-chip tc-chip--icon" aria-pressed="true">
                  Rotation
                </button>
                <button type="button" className="tc-chip tc-chip--icon" aria-pressed="false">
                  Regular starter
                </button>
                <button type="button" className="tc-chip tc-chip--icon" disabled>
                  Disabled
                </button>
              </div>
              <p className="tc-callout tc-callout--ok">Fee agreed — €1.20M. Now the contract.</p>
              <p className="tc-callout tc-callout--no">Cannot buy: transfer window closed.</p>
              <ul className="tc-gates">
                <li className="tc-gate tc-gate--ok">
                  <Check className="tc-icon" aria-hidden />
                  <span className="tc-gate__copy">
                    <strong>Transfer window open</strong>
                    <span className="tc-caption">You may bid in this phase.</span>
                  </span>
                </li>
                <li className="tc-gate tc-gate--no">
                  <X className="tc-icon" aria-hidden />
                  <span className="tc-gate__copy">
                    <strong>Scout report too thin</strong>
                    <span className="tc-caption">More scout weeks needed.</span>
                  </span>
                </li>
              </ul>
              <div className="tc-menu">
                <div className="tc-menu__list" role="menu" style={{ position: "static" }}>
                  <button type="button" role="menuitem" className="tc-menu__item tc-menu__item--danger">
                    <span className="tc-menu__label">Terminate contract</span>
                    <span className="tc-menu__hint">Pay the rest as severance — the player becomes a free agent.</span>
                  </button>
                </div>
              </div>
              <p className="tc-row">
                <span className="tc-state tc-state--good">● good</span>
                <span className="tc-state tc-state--mid">▲ fair</span>
                <span className="tc-state tc-state--low">◆ poor</span>
              </p>
              <div className="tc-chips">
                {["All", "GK", "CB", "U21", "28+"].map((label, index) => (
                  <button key={label} type="button" className="tc-chip tc-chip--dense" aria-pressed={index === 0}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="tc-cards">
              <article className="tc-card">
                <h3 className="tc-label tc-card__title">Attack</h3>
                <div className="tc-card__current">
                  <span className="tc-strong">Thomas Dose</span>
                  <span className="tc-list__meta">Quality 58 · environment ×1.02</span>
                </div>
                <p className="tc-label tc-card__subtitle">Candidates</p>
                <ul className="tc-list">
                  <li className="tc-list__item tc-list__item--wide">
                    <span className="tc-list__main">
                      <span className="tc-list__name">Stefan Evers</span>
                      <span className="tc-list__meta">Q84 · ×1.07 · € 10k/wk</span>
                    </span>
                    <button type="button" className="tc-btn tc-btn--primary tc-btn--sm">
                      Hire
                    </button>
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </Section>

        <Section
          id="portraits"
          title="Portraits"
          note="PlayerPortrait draws a faces.js face from the seed (always the same face), in the club's home kit. Nationality picks the skin and hair mix; staff are mixed men and women in a neutral shirt; unknown scouting targets show a silhouette."
        >
          <PortraitSamples />
        </Section>

        <Section id="ratings" title="Rating badges" note="CA bands: under 70, 70–84, 85–99, 100–114, 115 and up.">
          <div className="tc-row">
            {[62, 78, 92, 104, 116].map((ca) => (
              <span key={ca} className={`tc-rating tc-rating--${ratingBand(ca)}`}>
                {ca}
              </span>
            ))}
            <span className="tc-rating tc-rating--5 tc-rating--lg">116</span>
          </div>
        </Section>

        <Section id="players" title="Player cards">
          <a className="tc-player tc-player--link" href="#kerem">
            <PlayerPortrait seed={11} size="md" clubId={KIELER_FC} nationality="TR" />
            <span className="tc-player__id">
              <span className="tc-player__name">Kerem Yılmaz</span>
              <span className="tc-player__meta">CF · 15 · Istanbul camp</span>
            </span>
            <span className="tc-rating tc-rating--5 tc-rating--lg">116</span>
            <span className="tc-player__stats">
              <span>
                <span className="tc-stat__value">9</span>
                <span className="tc-label">Goals</span>
              </span>
              <span>
                <span className="tc-stat__value">3</span>
                <span className="tc-label">Assists</span>
              </span>
              <span>
                <span className="tc-stat__value">922</span>
                <span className="tc-label">Minutes</span>
              </span>
            </span>
            <span className="tc-player__fit">
              <span className="tc-player__meta">Fitness</span>
              <span className="tc-bar">
                <span className="tc-bar__fill" style={{ width: "92%" }} />
              </span>
              <span className="tc-player__fit-value">92</span>
            </span>
          </a>
          <div className="tc-player-grid">
            {[
              { id: "felix", name: "Felix Wolf", meta: "CB · 15 · U17", growth: "+1.0" },
              { id: "anton", name: "Anton Wagner", meta: "RB · 15 · U17", growth: "+0.8" },
              { id: "mats", name: "Mats Wagner", meta: "DM · 17 · U17", growth: "+0.6" },
              { id: "noah", name: "Noah Richter", meta: "CM · 16 · U19", growth: "+0.7" },
            ].map((player) => (
              <a key={player.id} className="tc-player tc-player--sm tc-player--link" href={`#${player.id}`}>
                <PlayerPortrait seed={player.id.length * 13} size="md" clubId={KIELER_FC} />
                <span className="tc-player__name">{player.name}</span>
                <span className="tc-player__meta">{player.meta}</span>
                <span className="tc-growth">{player.growth} this week</span>
              </a>
            ))}
          </div>
        </Section>

        <Section id="modal" title="Modal and key–value list">
          <button className="tc-btn" type="button" onClick={() => setModalOpen(true)}>
            Open camp modal
          </button>
          <dl className="tc-kv ui-gallery__kv">
            <dt>Cash</dt>
            <dd>€5.50M</dd>
            <dt>Board cash target</dt>
            <dd className="tc-ok">€3.5M ✓</dd>
            <dt>Wages covered</dt>
            <dd className="tc-attention">3 weeks</dd>
          </dl>
        </Section>

        <Section
          id="press"
          title="Press conference"
          note="PRD 28. A match-flow step: tone chips with direction hints, relationship meter, effect summary. Header NEXT submits, then kicks off."
        >
          <PressGallerySample />
        </Section>

        <Section id="treter" title="Der Treter" note="A newspaper object, the same in both themes. Newsreader and UnifrakturMaguntia are self-hosted in public/fonts.">
          <article className="tc-news" aria-label="Der Treter">
            <h3 className="tc-news__masthead">Der Treter</h3>
            <div className="tc-news__dateline">
              <span>Kiel · Thursday, 15 October 2026</span>
              <span>Oberliga Nord · Matchday 11</span>
              <span>€1.20</span>
            </div>
            <div className="tc-news__grid">
              <div>
                <p className="tc-news__kicker">Local football</p>
                <h4 className="tc-news__headline">Two 15-year-olds keep Kiel afloat</h4>
                <p className="tc-news__deck">Kerem Yılmaz and Mateusz Wójcik have scored 15 of Kieler FC&apos;s 18 league goals.</p>
                <div className="tc-news__cols">
                  <p>
                    They arrived in August from the club&apos;s new camps in Istanbul and Kraków, and nobody at the ground knew
                    their names. Eleven matchdays later the north stand sings them both.
                  </p>
                  <p>
                    It is still not enough. Saturday&apos;s 0:4 against VfB Flensburg was the heaviest home defeat of the season,
                    and Kieler FC sit 13th, three points above the drop.
                  </p>
                </div>
              </div>
              <aside className="tc-news__side">
                <div>
                  <h5 className="tc-news__side-title">Table</h5>
                  <table className="tc-news__table">
                    <tbody>
                      <tr>
                        <td>1 TSV Pinneberg Nord</td>
                        <td>26</td>
                      </tr>
                      <tr>
                        <td>2 SC Lübeck</td>
                        <td>25</td>
                      </tr>
                      <tr className="is-us">
                        <td>13 Kieler FC</td>
                        <td>12</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h5 className="tc-news__side-title">Transfer whispers</h5>
                  <p>FC Hasloh have bid €2.13 million for Kiel&apos;s 16-year-old midfielder Noah Richter.</p>
                </div>
              </aside>
            </div>
          </article>
        </Section>
      </main>

      {modalOpen ? (
        <div className="tc-scrim" onClick={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <div className="tc-modal" role="dialog" aria-modal="true" aria-labelledby="ui-gallery-camp-title">
            <div className="tc-modal__head">
              <div>
                <span className="tc-label">Satellite camp</span>
                <h2 className="tc-modal__title" id="ui-gallery-camp-title">
                  Turkey · Istanbul
                </h2>
              </div>
              <button className="tc-iconbtn" type="button" aria-label="Close" autoFocus onClick={() => setModalOpen(false)}>
                <svg className="tc-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="tc-modal__body">
              <dl className="tc-kv">
                <dt>Cost</dt>
                <dd>€1.73M</dd>
                <dt>Cash afterwards</dt>
                <dd>€3.77M</dd>
                <dt>Wages covered</dt>
                <dd>75 weeks</dd>
                <dt>Board cash target</dt>
                <dd className="tc-ok">€3.5M ✓</dd>
              </dl>
            </div>
            <div className="tc-modal__foot">
              <button className="tc-btn" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="tc-btn tc-btn--primary" type="button" onClick={() => setModalOpen(false)}>
                Pay €1.73M
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </PortraitKitProvider>
  );
}

export default UiGallery;
